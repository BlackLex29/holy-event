// app/api/send-email-otp/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as SibApiV3Sdk from '@getbrevo/brevo';

interface OTPRequestBody {
  email: string;
  name: string;
}

const OTP_EXPIRY_MINUTES = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  console.log("🚨 === send-email-otp API called ===");

  try {
    // Parse request body with error handling
    let body: OTPRequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" }, 
        { status: 400 }
      );
    }

    const { email, name } = body;
    console.log("📧 Request details:", { email, name });

    // Validation
    if (!email || !name) {
      console.error("❌ Missing email or name");
      return NextResponse.json(
        { error: "Email and name are required" }, 
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      console.error("❌ Invalid email format:", email);
      return NextResponse.json(
        { error: "Invalid email format" }, 
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      console.error("❌ Name too short:", name);
      return NextResponse.json(
        { error: "Name must be at least 2 characters long" }, 
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.BREVO_API_KEY) {
      console.error("❌ Missing BREVO_API_KEY in environment variables");
      return NextResponse.json({ 
        error: "Email service not configured. Please contact support." 
      }, { status: 503 });
    }

    console.log("🔐 API Key exists");

    // Generate OTP
    const OTP_CODE = generateOTP();
    console.log("🔐 Generated OTP for:", email);
    if (process.env.NODE_ENV === 'development') {
      console.log("🔓 DEV OTP:", OTP_CODE);
    }

    const timestamp = Date.now();
    const otpHash = Buffer.from(`${email.toLowerCase()}:${OTP_CODE}:${timestamp}`).toString("base64");
    const expiresAt = timestamp + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Send email with comprehensive error handling
    try {
      await sendEmailWithBrevo(email, name.trim(), OTP_CODE);
      console.log("✅ Email sent successfully to:", email);
    } catch (emailError: any) {
      console.error("❌ Failed to send email:", emailError);
      
      // Detailed error logging
      if (emailError.response) {
        console.error("❌ Brevo Error Status:", emailError.response.statusCode);
        console.error("❌ Brevo Error Body:", emailError.response.body);
      }
      
      // Return user-friendly error
      let errorMessage = "Failed to send verification email. Please try again.";
      let statusCode = 500;
      
      if (emailError.response?.statusCode === 403) {
        errorMessage = "Email service configuration error. Please contact support.";
        statusCode = 403;
      } else if (emailError.response?.statusCode === 401) {
        errorMessage = "Email service authentication failed. Please contact support.";
        statusCode = 401;
      } else if (emailError.response?.statusCode === 400) {
        errorMessage = "Invalid email address or configuration.";
        statusCode = 400;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
        },
        { status: statusCode }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      otpHash,
      expiresAt,
      debugOtp: process.env.NODE_ENV === 'development' ? OTP_CODE : undefined,
    });

  } catch (error: any) {
    console.error("❌ Unexpected error in send-email-otp:", error);
    
    return NextResponse.json(
      { 
        error: "An unexpected error occurred. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

function generateOTP(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return ((array[0] % 900000) + 100000).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailWithBrevo(email: string, name: string, otp: string): Promise<void> {
  console.log("📤 Preparing to send email via Brevo...");
  
  // Validate environment variables
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY not configured");
  }
  
  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL not configured");
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  try {
    // Set API key
    const apiKey = process.env.BREVO_API_KEY;
    apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
      apiKey
    );

    console.log("🔑 API key configured");
    console.log("📧 Sending to:", email);

    const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
    const SENDER_NAME = process.env.BREVO_SENDER_NAME || "HolyEvent";
    
    const emailData = {
      subject: `Your HolyEvent Verification Code: ${otp}`,
      sender: {
        name: SENDER_NAME,
        email: SENDER_EMAIL,
      },
      to: [{ email: email.toLowerCase(), name }],
      htmlContent: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:30px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:28px;">⛪ HolyEvent</h1>
              <p style="color:#fff;margin:5px 0 0 0;font-size:14px;opacity:0.9;">Parish Community</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#333;margin:0 0 20px 0;">Hi ${name}!</h2>
              <p style="color:#666;font-size:16px;margin:0 0 10px 0;">
                Thank you for registering with HolyEvent Parish Community.
              </p>
              <p style="color:#666;font-size:16px;margin:0 0 20px 0;">
                Your email verification code is:
              </p>
              
              <!-- OTP Code Box -->
              <div style="background:#f8f9fa;border:2px dashed #667eea;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                <span style="font-size:36px;font-weight:bold;color:#667eea;letter-spacing:8px;">${otp}</span>
              </div>
              
              <!-- Instructions -->
              <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;">
                <p style="color:#856404;font-size:14px;margin:0;">
                  <strong>⏱️ Important:</strong><br/>
                  This code expires in <strong>10 minutes</strong>.<br/>
                  Do not share this code with anyone.
                </p>
              </div>
              
              <p style="color:#666;font-size:14px;margin:20px 0 0 0;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#999;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} HolyEvent Parish Community<br/>
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    };

    console.log("📤 Sending email via Brevo API...");

    const result = await apiInstance.sendTransacEmail(emailData);
    
    console.log("✅ Brevo API Success:", result.response?.statusCode);

  } catch (err: any) {
    console.error("❌ Brevo send error details:");
    console.error("  Status:", err.statusCode || err.response?.statusCode);
    console.error("  Message:", err.message);
    console.error("  Response:", err.response?.body || err.response?.text);
    
    throw err;
  }
}