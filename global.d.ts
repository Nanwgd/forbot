export {}; // Это нужно для конвертации файла в модуль

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        // Добавьте любые другие методы и свойства, которые вы используете из `Telegram.WebApp`
        [key: string]: any; // Для временного использования, если вы не уверены в других методах
      };
    };
  }
}