"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Image as ImageIcon, Settings, Trash2, Mic, Paperclip, X, RefreshCcw } from "lucide-react";
import { TEXT_MODELS, IMAGE_MODELS, IMAGE_QUALITIES } from "@/lib/models";
import axios from "axios";
import { clsx } from "clsx";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "image";
  imageUrl?: string;
}

export default function Home() {
  // --- Состояния ---
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Настройки
  const [textModel, setTextModel] = useState(TEXT_MODELS[0]);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0]);
  const [imgRatio, setImgRatio] = useState("1:1");
  const [systemPrompt, setSystemPrompt] = useState("Ты полезный и умный помощник.");
  const [mode, setMode] = useState<"text" | "image">("text"); // Режим чата или генерации

  // Файлы
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Эффекты ---
  useEffect(() => {
    // Инициализация Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      // Устанавливаем цвета из темы Telegram
      document.body.style.backgroundColor = tg.themeParams.bg_color || "#ffffff";
    }
    
    // Загрузка истории (можно добавить LocalStorage)
    const savedSys = localStorage.getItem("bors_sys_prompt");
    if (savedSys) setSystemPrompt(savedSys);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Логика ---

  // Загрузка картинки (Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem("bors_history");
  };

  const saveSettings = () => {
    localStorage.setItem("bors_sys_prompt", systemPrompt);
    setActiveTab("chat");
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachedImage) return;

    const userText = input.trim();
    setInput("");
    
    // 1. Формируем сообщение пользователя
    const newMsg: Message = { role: "user", content: userText };
    
    // Если есть картинка для анализа (vision)
    if (attachedImage && mode === "text") {
        // Тут логика для Vision (в этом примере упростим: отправляем как текст с пометкой, 
        // так как полноценный Vision требует сложной структуры API)
        // Но для генерации фото (режим image) картинка не нужна в инпуте
        newMsg.content = `[Изображение прикреплено] ${userText}`;
        newMsg.imageUrl = attachedImage;
    }

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);
    setAttachedImage(null); // Сброс картинки после отправки

    try {
      if (mode === "text") {
        // --- ЧАТ С ИИ ---
        const apiMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userText } // В реальном Vision API сюда нужно сунуть base64
        ];
        
        // Если была прикреплена картинка, Vision логику надо писать тут.
        // Для простоты пока только текст.
        
        const { data } = await axios.post("/api/chat", {
          model: textModel,
          messages: apiMessages
        });

        const reply = data.choices[0].message.content;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      } else {
        // --- ГЕНЕРАЦИЯ ФОТО ---
        const { data } = await axios.post("/api/image", {
          model: imageModel,
          prompt: userText,
          ratio: imgRatio
        });

        if (data.files && data.files.length > 0) {
          const imgBase64 = `data:image/jpeg;base64,${data.files[0]}`;
          setMessages((prev) => [...prev, { 
            role: "assistant", 
            content: `🎨 ${userText}`, 
            type: "image", 
            imageUrl: imgBase64 
          }]);
        } else {
            throw new Error("No image data");
        }
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Ошибка: Не удалось получить ответ." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Рендер Настроек ---
  if (activeTab === "settings") {
    return (
      <div className="p-4 min-h-screen pb-24 space-y-6">
        <h1 className="text-2xl font-bold mb-4">Настройки Bors AI</h1>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">Системный промпт</label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-32 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">Текстовая модель</label>
          <select 
            value={textModel} 
            onChange={(e) => setTextModel(e.target.value)}
            className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            {TEXT_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Модель рисования</label>
            <select 
                value={imageModel} 
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
                {IMAGE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Формат фото</label>
            <div className="grid grid-cols-3 gap-2">
                {IMAGE_QUALITIES.map(q => (
                    <button
                        key={q.id}
                        onClick={() => setImgRatio(q.id)}
                        className={clsx(
                            "p-2 rounded-lg text-sm border transition-all",
                            imgRatio === q.id 
                                ? "bg-blue-500 text-white border-blue-500" 
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        )}
                    >
                        {q.name.split(' ')[0]} {q.id}
                    </button>
                ))}
            </div>
        </div>

        <button 
            onClick={handleClearHistory}
            className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center gap-2"
        >
            <Trash2 size={18} /> Очистить историю чата
        </button>

        <button 
          onClick={saveSettings}
          className="fixed bottom-6 left-4 right-4 bg-blue-600 text-white p-4 rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform"
        >
          Сохранить и выйти
        </button>
      </div>
    );
  }

  // --- Рендер Чата ---
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    onClick={() => setMode("text")}
                    className={clsx("px-3 py-1 rounded-md text-sm transition-all", mode === "text" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-500")}
                >Chat</button>
                <button 
                    onClick={() => setMode("image")}
                    className={clsx("px-3 py-1 rounded-md text-sm transition-all", mode === "image" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-500")}
                >Draw</button>
            </div>
            <span className="text-xs text-gray-400 ml-2 truncate max-w-[100px]">
                {mode === "text" ? textModel : imageModel}
            </span>
        </div>
        <button onClick={() => setActiveTab("settings")} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
          <Settings size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-4 animate-pulse" />
                <p>Начните общение с Bors AI</p>
            </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex flex-col max-w-[85%]", msg.role === "user" ? "self-end items-end" : "self-start items-start")}>
            {msg.imageUrl && (
                <img src={msg.imageUrl} alt="attached" className="rounded-xl mb-2 max-w-[200px] border-4 border-white dark:border-gray-700 shadow-sm" />
            )}
            <div
              className={clsx(
                "p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="self-start bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
        {attachedImage && (
            <div className="relative inline-block mb-2">
                <img src={attachedImage} className="h-16 w-16 object-cover rounded-lg border dark:border-gray-700" />
                <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md">
                    <X size={12} />
                </button>
            </div>
        )}
        
        <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 focus-within:ring-2 ring-blue-500/50 transition-all">
            {mode === "text" && (
                <>
                <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                <label htmlFor="file-upload" className="p-2 text-gray-400 hover:text-blue-500 cursor-pointer">
                    <Paperclip size={20} />
                </label>
                </>
            )}
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            placeholder={mode === "image" ? "Опиши, что нарисовать..." : "Сообщение..."}
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 py-2 text-sm"
            rows={1}
          />
          
          <button 
            onClick={sendMessage} 
            disabled={(!input.trim() && !attachedImage) || isLoading}
            className={clsx(
                "p-2 rounded-xl transition-all",
                (input.trim() || attachedImage) && !isLoading
                    ? "bg-blue-600 text-white shadow-md hover:scale-105" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400"
            )}
          >
            {mode === "text" ? <Send size={20} /> : <ImageIcon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}