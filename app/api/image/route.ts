import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { prompt, model, ratio } = await req.json();

    // Простая заглушка перевода, в идеале тоже через AI, но для скорости пропустим
    // или отправим как есть, если модель понимает русский.
    
    const response = await axios.post(
      process.env.AI_IMAGE_ENDPOINT as string,
      {
        model: model,
        prompt: prompt, // Отправляем как есть
        ratio: ratio
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`
        },
        timeout: 90000
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Image Gen Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Ошибка генерации" }, { status: 500 });
  }
}