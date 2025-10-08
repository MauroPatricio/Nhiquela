// utils/imageUtils.ts
export const formatBase64Image = (base64String: string | undefined): string => {
    if (!base64String) {
      return "https://via.placeholder.com/150/007bff/ffffff?text=DR";
    }
  
    // ✅ Se já tem prefixo data:image, usa diretamente
    if (base64String.startsWith('data:image')) {
      return base64String;
    }
  
    if (base64String.length > 100 && !base64String.startsWith('data:') && !base64String.startsWith('http')) {
      return `data:image/jpeg;base64,${base64String}`;
    }
  
    if (base64String.startsWith('http')) {
      console.log("🖼️ [ImageUtils] URL de imagem");
      return base64String;
    }
    return "https://via.placeholder.com/150/007bff/ffffff?text=DR";
  };
  
  export const isBase64Image = (str: string | undefined): boolean => {
    if (!str) return false;
    
    return (
      str.startsWith('data:image') || 
      (str.length > 100 && !str.startsWith('http') && !str.startsWith('/'))
    );
  };