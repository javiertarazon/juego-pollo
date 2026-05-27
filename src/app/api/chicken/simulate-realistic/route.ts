import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Not implemented',
      message: 'Endpoint simulate-realistic pendiente de implementación.',
    },
    { status: 501 }
  );
}
