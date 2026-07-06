// services/ocrService.js
// Placeholder OCR service – in production replace with actual OCR/AI integration.

export default {
  async extractText(filePath) {
    // Simulate OCR processing delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ items: [] }); // Empty items placeholder
      }, 500);
    });
  },
};
