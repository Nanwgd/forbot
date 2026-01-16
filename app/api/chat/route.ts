import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    const response = await axios.post(
      `${process.env.AI_TEXT_BASE}/chat/completions`,
      {
        model: model,
        messages: messages,
        plugins: ["web_search"]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 минуты
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("AI Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Ошибка API" }, { status: 500 });
  }
}