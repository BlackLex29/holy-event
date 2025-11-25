import { NextRequest, NextResponse } from "next/server";

interface VerifyOTPRequestBody {
  code: string;
  hash: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyOTPRequestBody = await request.json();
    const { code, hash, email } = body;

    // Validation
    if (!code || !hash || !email) {
      return NextResponse.json(
        { error: "Code, hash, and email are required" },
        { status: 400 }
      );
    }

    if (code.length !== 6) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    // Decode the hash
    const decodedData = Buffer.from(hash, 'base64').toString();
    const [storedEmail, storedOTP, expiresAtStr] = decodedData.split(':');
    
    const expiresAt = parseInt(expiresAtStr);

    // Check expiration
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Check email match
    if (email.toLowerCase() !== storedEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Email mismatch" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = code === storedOTP;

    return NextResponse.json({
      success: isValid,
      message: isValid ? "OTP verified successfully" : "Invalid OTP code"
    });

  } catch (error: any) {
    console.error("Unexpected error in verify-otp:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to verify OTP. Please try again."
      },
      { status: 500 }
    );
  }
}