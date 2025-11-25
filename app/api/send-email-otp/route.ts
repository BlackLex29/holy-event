import { NextRequest, NextResponse } from "next/server";

interface SendOTPRequestBody {
  email: string;
  name: string;
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a hash containing email, OTP, and timestamp
function createOTPHash(email: string, otp: string, expiresAt: number): string {
  const data = `${email.toLowerCase()}:${otp}:${expiresAt}`;
  return Buffer.from(data).toString('base64');
}

export async function POST(request: NextRequest) {
  console.log("📧 Starting OTP email process...");
  
  try {
    const body: SendOTPRequestBody = await request.json();
    const { email, name } = body;

    console.log("📝 Received request for:", { email: email?.toLowerCase(), name });

    // Validation
    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if Brevo API key is configured
    const brevoApiKey = process.env.BREVO_API_KEY;
    console.log("🔑 Brevo API Key configured:", !!brevoApiKey);
    
    if (!brevoApiKey) {
      console.error("❌ BREVO_API_KEY is not configured in environment variables");
      return NextResponse.json(
        { error: "Email service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Generate OTP and expiration time (10 minutes from now)
    const otp = generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Create hash
    const otpHash = createOTPHash(email, otp, expiresAt);

    console.log("🔐 Generated OTP for:", email.toLowerCase());

    // Send email using Brevo TRANSACTIONAL API
    const brevoPayload = {
      sender: {
        name: 'Holy Event',
        email: process.env.BREVO_SENDER_EMAIL || 'andreanicolenatividad13@gmail.com'
      },
      to: [
        {
          email: email.toLowerCase().trim(),
          name: name.trim()
        }
      ],
      subject: 'Email Verification Code - Holy Event',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                  font-family: Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background-color: #f5f5f5;
                }
                .container {
                  background-color: white;
                  border-radius: 10px;
                  overflow: hidden;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header { 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  padding: 30px; 
                  text-align: center; 
                }
                .header h1 { 
                  color: white; 
                  margin: 0; 
                  font-size: 28px; 
                }
                .content { 
                  padding: 30px; 
                }
                .otp-code { 
                  font-size: 42px; 
                  font-weight: bold; 
                  text-align: center; 
                  letter-spacing: 8px; 
                  color: #059669; 
                  margin: 30px 0; 
                  font-family: monospace;
                  background-color: #f0fdf4;
                  padding: 20px;
                  border-radius: 8px;
                  border: 2px dashed #059669;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #6b7280; 
                  font-size: 14px; 
                }
                .warning { 
                  background: #fef3cd; 
                  border: 1px solid #fde68a; 
                  padding: 15px; 
                  border-radius: 5px; 
                  margin: 20px 0; 
                }
                .info-box {
                  background: #e0f2fe;
                  border: 1px solid #bae6fd;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🙏 Holy Event</h1>
                </div>
                <div class="content">
                    <h2>Hello ${name},</h2>
                    <p>Welcome to Holy Event! Please use the verification code below to complete your registration:</p>
                    
                    <div class="otp-code">${otp}</div>
                    
                    <div class="info-box">
                        <p style="margin: 0;"><strong>📋 How to use this code:</strong></p>
                        <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Return to the registration page</li>
                            <li>Enter this 6-digit code in the verification field</li>
                            <li>Click "Verify & Complete Registration"</li>
                        </ol>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                    </div>
                    
                    <p>If you didn't request this verification code, please ignore this email or contact our support team if you have concerns.</p>
                    
                    <div class="footer">
                        <p><strong>Holy Event</strong><br>
                        Parish Community Management System</p>
                        <p style="margin-top: 10px; font-size: 12px;">
                            This is an automated email. Please do not reply to this message.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `Welcome to Holy Event, ${name}!

Your verification code is: ${otp}

This code will expire in 10 minutes. Do not share this code with anyone.

If you didn't request this verification code, please ignore this email.

Holy Event - Parish Community Management System`
    };

    console.log("📨 Sending request to Brevo Transactional API...");
    console.log("📧 Sending to:", email.toLowerCase().trim());
    
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(brevoPayload)
    });

    const brevoData = await brevoResponse.json();

    console.log("📨 Brevo API Response:", {
      status: brevoResponse.status,
      statusText: brevoResponse.statusText,
      data: brevoData
    });

    if (!brevoResponse.ok) {
      console.error('❌ Brevo API error:', brevoData);
      
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      if (brevoResponse.status === 401) {
        errorMessage = 'Email service authentication failed. Please contact support.';
      } else if (brevoResponse.status === 402) {
        errorMessage = 'Email service limit reached. Please contact support.';
      } else if (brevoResponse.status === 400) {
        const detailedError = brevoData.message || JSON.stringify(brevoData);
        errorMessage = `Invalid email request: ${detailedError}`;
        console.error('Detailed 400 error:', detailedError);
      } else if (brevoData.message) {
        errorMessage = `Email service error: ${brevoData.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: brevoData },
        { status: brevoResponse.status }
      );
    }

    console.log('✅ Brevo email sent successfully. Message ID:', brevoData.messageId);

    return NextResponse.json({
      success: true,
      otpHash,
      expiresAt,
      messageId: brevoData.messageId
    });

  } catch (error: any) {
    console.error("❌ Unexpected error in send-email-otp:", error);
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to process request. Please try again.",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}