"""服务模块"""
from .dingtalk import send_dingtalk_alarm, send_dingtalk_text

__all__ = [
    "send_dingtalk_alarm",
    "send_dingtalk_text"
]
