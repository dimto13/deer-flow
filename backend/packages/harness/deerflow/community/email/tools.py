import imaplib
import smtplib
import email
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from langchain.tools import tool

logger = logging.getLogger(__name__)

def _get_account_env(account_id: str, suffix: str, default=None):
    """Helper to resolve EMAIL_{ACCOUNT}_{SUFFIX} environment variables."""
    prefix = f"EMAIL_{account_id.upper().replace('.', '_').replace('-', '_')}"
    return os.environ.get(f"{prefix}_{suffix}", default)

def _get_imap_connection(account: str):
    server = _get_account_env(account, "IMAP_SERVER", "imap.1und1.de")
    raw_port = _get_account_env(account, "IMAP_PORT")
    port = int(raw_port) if raw_port and raw_port.strip() else 993
    user = _get_account_env(account, "USER")
    password = _get_account_env(account, "PASSWORD")
    
    if not user or not password:
        raise ValueError(f"Credentials for account '{account}' not found.")
    
    mail = imaplib.IMAP4_SSL(server, port)
    mail.login(user, password)
    return mail

@tool("get_available_email_accounts", parse_docstring=True)
def get_available_email_accounts_tool() -> str:
    """List all email accounts currently configured in the system.
    Use this tool to discover which account identifiers (like 'privat' or 'work') 
    can be used with the other email tools.
    """
    accounts = []
    for key in os.environ:
        if key.startswith("EMAIL_") and key.endswith("_USER"):
            identifier = key.replace("EMAIL_", "").replace("_USER", "").lower()
            if identifier != "online": # Skip the shared server settings prefix if it exists
                accounts.append(identifier)
    
    if not accounts:
        return "No email accounts configured in environment."
    
    return "Available email accounts: " + ", ".join(accounts)

@tool("list_email_folders", parse_docstring=True)
def list_email_folders_tool(account: str = "tobiasfreudling_online") -> str:
    """List all available folders (mailboxes) in the email account.

    Args:
        account: The account identifier (e.g. "tobiasfreudling_online").
    """
    try:
        mail = _get_imap_connection(account)
        status, folders = mail.list()
        mail.logout()
        
        if status != "OK":
            return f"Error listing folders: {status}"
        
        result = []
        for folder in folders:
            result.append(folder.decode())
        return "\n".join(result)
    except Exception as e:
        return f"Error: {str(e)}"

@tool("list_emails", parse_docstring=True)
def list_emails_tool(account: str = "tobiasfreudling_online", folder: str = "INBOX", limit: int = 10) -> str:
    """List recent emails from a given IMAP account and folder.

    Args:
        account: The account identifier (e.g. "tobiasfreudling_online").
        folder: The IMAP folder to list emails from (default: INBOX).
        limit: Maximum number of emails to retrieve (default: 10).
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(folder)
        status, messages = mail.search(None, "ALL")
        
        email_ids = messages[0].split()
        recent_ids = email_ids[-limit:]
        recent_ids.reverse()

        results = []
        for e_id in recent_ids:
            res, msg_data = mail.fetch(e_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes): subject = subject.decode(encoding if encoding else "utf-8")
                    from_addr, encoding = decode_header(msg.get("From"))[0]
                    if isinstance(from_addr, bytes): from_addr = from_addr.decode(encoding if encoding else "utf-8")
                    results.append(f"Account: {account}, ID: {e_id.decode()}, Date: {msg.get('Date')}, From: {from_addr}, Subject: {subject}")

        mail.close()
        mail.logout()
        return "\n".join(results) if results else "No emails found."
    except Exception as e:
        return f"Error: {str(e)}"

@tool("read_email", parse_docstring=True)
def read_email_tool(email_id: str, account: str = "tobiasfreudling_online", folder: str = "INBOX") -> str:
    """Read the full content of a specific email.

    Args:
        email_id: The unique ID of the email to read.
        account: The account identifier.
        folder: The folder where the email is located (default: INBOX).
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(folder)
        res, msg_data = mail.fetch(email_id, "(RFC822)")
        
        content = ""
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode(errors="replace")
                            break
                else:
                    body = msg.get_payload(decode=True).decode(errors="replace")
                content = f"Account: {account}\nFrom: {msg['From']}\nSubject: {msg['Subject']}\nDate: {msg['Date']}\n\n{body}"
        
        mail.close()
        mail.logout()
        return content if content else "Email not found."
    except Exception as e:
        return f"Error: {str(e)}"

@tool("search_emails", parse_docstring=True)
def search_emails_tool(query: str, account: str = "tobiasfreudling_online", folder: str = "INBOX") -> str:
    """Search for emails using IMAP search criteria (e.g. 'FROM "google"', 'SUBJECT "invoice"').

    Args:
        query: IMAP search criteria string.
        account: The account identifier.
        folder: Folder to search in.
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(folder)
        status, messages = mail.search(None, query)
        
        ids = messages[0].split()
        if not ids: return "No matches found."
        
        results = []
        for e_id in ids[-20:]: # Limit to 20 results
            res, msg_data = mail.fetch(e_id, "(RFC822)")
            for part in msg_data:
                if isinstance(part, tuple):
                    msg = email.message_from_bytes(part[1])
                    subject, _ = decode_header(msg["Subject"])[0]
                    results.append(f"ID: {e_id.decode()}, Subject: {subject}")
        
        mail.close()
        mail.logout()
        return "\n".join(results)
    except Exception as e:
        return f"Error: {str(e)}"

@tool("move_email", parse_docstring=True)
def move_email_tool(email_id: str, target_folder: str, account: str = "tobiasfreudling_online", source_folder: str = "INBOX") -> str:
    """Move an email to another folder.

    Args:
        email_id: The ID of the email to move.
        target_folder: Destination folder name.
        account: The account identifier.
        source_folder: Current folder.
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(source_folder)
        result = mail.copy(email_id, target_folder)
        if result[0] == "OK":
            mail.store(email_id, "+FLAGS", "\\Deleted")
            mail.expunge()
            mail.logout()
            return f"Successfully moved email {email_id} to {target_folder}."
        mail.logout()
        return f"Error moving email: {result}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool("delete_email", parse_docstring=True)
def delete_email_tool(email_id: str, account: str = "tobiasfreudling_online", folder: str = "INBOX") -> str:
    """Mark an email as deleted (moves it to Trash or removes it depending on server).

    Args:
        email_id: The ID of the email to delete.
        account: The account identifier.
        folder: Folder name.
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(folder)
        mail.store(email_id, "+FLAGS", "\\Deleted")
        mail.expunge()
        mail.logout()
        return f"Successfully deleted email {email_id} from {folder}."
    except Exception as e:
        return f"Error: {str(e)}"

@tool("send_email", parse_docstring=True)
def send_email_tool(to_addr: str, subject: str, body: str, account: str = "tobiasfreudling_online") -> str:
    """Send an email from the specified account.

    Args:
        to_addr: Recipient email address.
        subject: Email subject.
        body: Email message body.
        account: The account identifier to send from.
    """
    try:
        user = _get_account_env(account, "USER")
        password = _get_account_env(account, "PASSWORD")
        smtp_server = _get_account_env(account, "SMTP_SERVER", "smtp.1und1.de")
        smtp_port = int(_get_account_env(account, "SMTP_PORT", 587))
        
        msg = MIMEMultipart()
        msg['From'] = user
        msg['To'] = to_addr
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(user, password)
        server.send_message(msg)
        server.quit()
        return f"Successfully sent email to {to_addr}."
    except Exception as e:
        return f"Error sending email: {str(e)}"

@tool("set_email_flags", parse_docstring=True)
def set_email_flags_tool(email_id: str, flag: str, account: str = "tobiasfreudling_online", folder: str = "INBOX", action: str = "add") -> str:
    """Add or remove flags (like \\Seen, \\Answered) for an email.

    Args:
        email_id: The ID of the email.
        flag: The flag to modify (e.g. "\\Seen" for marking as read).
        account: The account identifier.
        folder: Folder name.
        action: "add" or "remove".
    """
    try:
        mail = _get_imap_connection(account)
        mail.select(folder)
        op = "+FLAGS" if action == "add" else "-FLAGS"
        mail.store(email_id, op, flag)
        mail.logout()
        return f"Successfully updated flag {flag} for email {email_id}."
    except Exception as e:
        return f"Error: {str(e)}"
