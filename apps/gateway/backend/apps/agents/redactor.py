"""
PII Redaction Module
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PIIRedactor:
    """
    Redacts PII from text, logs, and data structures.
    """
    
    def __init__(self):
        # PII patterns
        self.patterns = {
            'pan': re.compile(r'\b\d{13,19}\b'),  # PAN numbers
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b\d{10}\b'),  # 10-digit phone numbers
            'aadhar': re.compile(r'\b\d{12}\b'),  # Aadhar numbers
        }
        
        self.replacements = {
            'pan': '****REDACTED****',
            'email': '***@***.***',
            'phone': '***-***-****',
            'aadhar': '****-****-****'
        }
    
    def redact_text(self, text: str) -> str:
        """
        Redact PII from text.
        """
        if not text:
            return text
        
        redacted_text = text
        
        for pii_type, pattern in self.patterns.items():
            redacted_text = pattern.sub(self.replacements[pii_type], redacted_text)
        
        return redacted_text
    
    def redact_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively redact PII from dictionary.
        """
        if not isinstance(data, dict):
            return data
        
        redacted_data = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                redacted_data[key] = self.redact_text(value)
            elif isinstance(value, dict):
                redacted_data[key] = self.redact_dict(value)
            elif isinstance(value, list):
                redacted_data[key] = self.redact_list(value)
            else:
                redacted_data[key] = value
        
        return redacted_data
    
    def redact_list(self, data: list) -> list:
        """
        Recursively redact PII from list.
        """
        if not isinstance(data, list):
            return data
        
        redacted_list = []
        
        for item in data:
            if isinstance(item, str):
                redacted_list.append(self.redact_text(item))
            elif isinstance(item, dict):
                redacted_list.append(self.redact_dict(item))
            elif isinstance(item, list):
                redacted_list.append(self.redact_list(item))
            else:
                redacted_list.append(item)
        
        return redacted_list
    
    def is_pii_detected(self, text: str) -> bool:
        """
        Check if text contains PII.
        """
        if not text:
            return False
        
        for pattern in self.patterns.values():
            if pattern.search(text):
                return True
        
        return False
    
    def get_pii_types(self, text: str) -> list:
        """
        Get list of PII types detected in text.
        """
        if not text:
            return []
        
        detected_types = []
        
        for pii_type, pattern in self.patterns.items():
            if pattern.search(text):
                detected_types.append(pii_type)
        
        return detected_types
