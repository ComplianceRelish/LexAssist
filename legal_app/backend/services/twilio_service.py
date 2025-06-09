"""
Twilio Verify Service for Email and SMS verification
"""
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import os
import logging

logger = logging.getLogger(__name__)

class TwilioVerifyService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.verify_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID")
        
        if not all([self.account_sid, self.auth_token, self.verify_service_sid]):
            raise ValueError("Missing Twilio credentials in environment variables")
        
        self.client = Client(self.account_sid, self.auth_token)
        
    async def send_email_verification(self, email: str) -> dict:
        """Send email verification code using Twilio Verify"""
        try:
            logger.info(f"Sending email verification to: {email}")
            
            verification = self.client.verify.v2.services(
                self.verify_service_sid
            ).verifications.create(
                to=email,
                channel='email'
            )
            
            logger.info(f"Email verification sent. Status: {verification.status}")
            
            return {
                "success": verification.status == 'pending',
                "status": verification.status,
                "sid": verification.sid
            }
        except TwilioException as e:
            logger.error(f"Twilio email error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_sms_verification(self, phone: str) -> dict:
        """Send SMS verification code using Twilio Verify"""
        try:
            logger.info(f"Sending SMS verification to: {phone}")
            
            verification = self.client.verify.v2.services(
                self.verify_service_sid
            ).verifications.create(
                to=phone,
                channel='sms'
            )
            
            logger.info(f"SMS verification sent. Status: {verification.status}")
            
            return {
                "success": verification.status == 'pending',
                "status": verification.status,
                "sid": verification.sid
            }
        except TwilioException as e:
            logger.error(f"Twilio SMS error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_code(self, to: str, code: str) -> dict:
        """Verify the code for email or phone"""
        try:
            logger.info(f"Verifying code for: {to}")
            
            verification_check = self.client.verify.v2.services(
                self.verify_service_sid
            ).verification_checks.create(
                to=to,
                code=code
            )
            
            logger.info(f"Verification result. Status: {verification_check.status}")
            
            return {
                "success": verification_check.status == 'approved',
                "status": verification_check.status,
                "sid": verification_check.sid
            }
        except TwilioException as e:
            logger.error(f"Twilio verification error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Create singleton instance
twilio_service = TwilioVerifyService()