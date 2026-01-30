"""
钉钉机器人通知服务
"""
import time
import hmac
import hashlib
import base64
import urllib.parse
from typing import Optional
import httpx
from app.core.config import settings


async def send_dingtalk_alarm(alarm) -> bool:
    """
    发送钉钉报警通知
    
    Args:
        alarm: AlarmEvent对象
    
    Returns:
        是否发送成功
    """
    webhook = settings.DINGTALK_WEBHOOK
    secret = settings.DINGTALK_SECRET
    
    if not webhook:
        return False
    
    # 构建签名
    if secret:
        timestamp = str(round(time.time() * 1000))
        secret_enc = secret.encode('utf-8')
        string_to_sign = f'{timestamp}\n{secret}'
        string_to_sign_enc = string_to_sign.encode('utf-8')
        hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
        webhook = f"{webhook}&timestamp={timestamp}&sign={sign}"
    
    # 报警级别颜色映射
    level_colors = {
        "low": "#52c41a",
        "medium": "#faad14",
        "high": "#ff7a45",
        "critical": "#f5222d"
    }
    
    # 报警类型名称映射
    type_names = {
        "intrusion": "入侵报警",
        "stay": "滞留报警",
        "absence": "缺勤报警",
        "unauthorized": "未授权报警"
    }
    
    # 构建消息内容
    alarm_type_name = type_names.get(alarm.type, alarm.type)
    level_color = level_colors.get(alarm.level, "#faad14")
    
    # Markdown格式消息
    content = f"""### 🚨 {alarm_type_name}

**报警级别**: <font color="{level_color}">{alarm.level.upper()}</font>

**报警时间**: {alarm.created_at.strftime('%Y-%m-%d %H:%M:%S')}

"""
    
    if alarm.zone_name:
        content += f"**围栏区域**: {alarm.zone_name}\n\n"
    
    if alarm.camera_name:
        content += f"**摄像头**: {alarm.camera_name}\n\n"
    
    if alarm.person_role:
        content += f"**人员类型**: {alarm.person_role}\n\n"
    
    if alarm.location_x is not None and alarm.location_y is not None:
        content += f"**位置坐标**: ({alarm.location_x:.2f}, {alarm.location_y:.2f})\n\n"
    
    if alarm.description:
        content += f"**详细描述**: {alarm.description}\n\n"
    
    content += "---\n请及时处理！"
    
    # 构建请求体
    data = {
        "msgtype": "markdown",
        "markdown": {
            "title": f"🚨 {alarm_type_name}",
            "text": content
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook,
                json=data,
                timeout=10.0
            )
            result = response.json()
            return result.get("errcode") == 0
    except Exception as e:
        print(f"钉钉通知发送失败: {e}")
        return False


async def send_dingtalk_text(text: str) -> bool:
    """
    发送钉钉文本消息
    
    Args:
        text: 消息文本
    
    Returns:
        是否发送成功
    """
    webhook = settings.DINGTALK_WEBHOOK
    secret = settings.DINGTALK_SECRET
    
    if not webhook:
        return False
    
    # 构建签名
    if secret:
        timestamp = str(round(time.time() * 1000))
        secret_enc = secret.encode('utf-8')
        string_to_sign = f'{timestamp}\n{secret}'
        string_to_sign_enc = string_to_sign.encode('utf-8')
        hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
        webhook = f"{webhook}&timestamp={timestamp}&sign={sign}"
    
    data = {
        "msgtype": "text",
        "text": {
            "content": text
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook,
                json=data,
                timeout=10.0
            )
            result = response.json()
            return result.get("errcode") == 0
    except Exception as e:
        print(f"钉钉通知发送失败: {e}")
        return False
