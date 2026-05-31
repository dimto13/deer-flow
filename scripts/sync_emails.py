#!/usr/bin/env python3
import os
import re
import sys
import yaml
from pathlib import Path

# Paths
BASHRC = Path("/home/tobi/.bashrc")
COMPOSE_FILE = Path("docker/docker-compose-dev.yaml")

def get_bashrc_emails():
    """Extract all EMAIL_ variables from ~/.bashrc."""
    if not BASHRC.exists():
        print(f"❌ Error: {BASHRC} not found.")
        return {}
    
    emails = {}
    content = BASHRC.read_text()
    # Matches: export EMAIL_...="..." or export EMAIL_...='...' or export EMAIL_...=...
    matches = re.findall(r'export\s+(EMAIL_[A-Z0-9_]+)\s*=\s*["\']?(.*?)["\']?\s*(?:\n|$)', content)
    for key, value in matches:
        emails[key] = value.strip()
    return emails

def get_mapped_vars():
    """Get list of EMAIL_ variables currently mapped in docker-compose."""
    if not COMPOSE_FILE.exists():
        return []
    
    with open(COMPOSE_FILE, 'r') as f:
        data = yaml.safe_load(f)
    
    gateway_env = data.get('services', {}).get('gateway', {}).get('environment', [])
    mapped = []
    for item in gateway_env:
        # Matches: - KEY=${KEY:-}
        match = re.match(r'^\s*([A-Z0-9_]+)=', item)
        if match:
            var_name = match.group(1)
            if var_name.startswith("EMAIL_"):
                mapped.append(var_name)
    return mapped

def update_compose(missing_vars):
    """Add missing variables to docker-compose-dev.yaml."""
    content = COMPOSE_FILE.read_text()
    
    # Find the environment section of the gateway service
    # This is a bit safer with regex than yaml.dump to preserve comments/formatting
    lines = content.splitlines()
    new_lines = []
    in_gateway = False
    in_env = False
    added = False
    
    for line in lines:
        if line.strip() == "gateway:":
            in_gateway = True
        elif in_gateway and "environment:" in line:
            in_env = True
        elif in_env and not line.startswith("      -") and line.strip() != "environment:":
            # We reached the end of the environment block
            if not added:
                for var in missing_vars:
                    new_lines.append(f"      - {var}=${{{var}:-}}")
                added = True
            in_env = False
            in_gateway = False
        
        new_lines.append(line)
        
    COMPOSE_FILE.write_text("\n".join(new_lines) + "\n")

def update_agent_soul(accounts):
    """Update the agent's SOUL.md with the current list of accounts."""
    soul_path = Path("backend/.deer-flow/users/7a6df51c-478f-4ba4-9850-dfab39080d97/agents/email/SOUL.md")
    if not soul_path.exists():
        return

    content = soul_path.read_text()
    
    # Prepare the accounts list text
    accounts_text = "**Verfügbare Konten (Account Identifier):**\n"
    for i, (key, value) in enumerate(accounts.items(), 1):
        # Extract identifier from key: EMAIL_IDENTIFIER_USER
        identifier = key.replace("EMAIL_", "").replace("_USER", "").lower()
        accounts_text += f"{i}. `{identifier}` ({value})\n"

    # Replace the existing accounts section using regex
    pattern = r"\*\*Verfügbare Konten \(Account Identifier\):\*\*[\s\S]*?(?=\n\n\*\*)"
    if re.search(pattern, content):
        new_content = re.sub(pattern, accounts_text.strip(), content)
    else:
        # If section doesn't exist, try to insert it after the Identity header
        new_content = content.replace("**Identity**\n", f"**Identity**\n\n{accounts_text}\n")
    
    soul_path.write_text(new_content)
    print(f"✅ Agent SOUL.md updated with {len(accounts)} accounts.")

def main():
    print("🔍 Checking Email Configuration Sync...")
    
    bashrc_vars = get_bashrc_emails()
    user_vars = {k: v for k, v in bashrc_vars.items() if k.endswith("_USER")}
    mapped_vars = get_mapped_vars()
    
    missing = [v for v in bashrc_vars if v not in mapped_vars]
    
    if not missing:
        print("✅ All email variables from ~/.bashrc are correctly mapped in DeerFlow.")
        update_agent_soul(user_vars)
        return

    print(f"⚠️  Found {len(missing)} new email variables in ~/.bashrc that are NOT yet in DeerFlow:")
    for v in missing:
        print(f"   - {v}")
    
    print("\n💡 To fix this, I need to update docker-compose-dev.yaml and you need to restart.")
    
    choice = input("👉 Should I update the docker-compose-dev.yaml for you? (y/n): ").lower()
    if choice == 'y':
        update_compose(missing)
        print("✅ docker-compose-dev.yaml updated.")
        update_agent_soul(user_vars)
        print("\n🚀 Please run the following command to apply the changes:")
        print("   bash -ic 'DEER_FLOW_ROOT=$(pwd) docker compose -p deer-flow-dev -f docker/docker-compose-dev.yaml up -d gateway'")
    else:
        print("❌ Action cancelled.")

if __name__ == "__main__":
    main()
