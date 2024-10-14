import User from '../models/UserModel.js';

export const updatePushToken = async (req, res) => {
    const { pushToken } = req.body;
    const { id } = req.params;
  
    // Verifica se o pushToken foi fornecido
    if (!pushToken) {
      return res.status(400).json({ error: 'O pushToken é obrigatório' });
    }
  
    try {
      // Atualiza apenas o pushToken do utilizador
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { pushToken },
        { new: true, runValidators: true } // Retorna o usuário atualizado
      );
  
      // Verifica se o utilizador foi encontrado
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
  
      // Retorna a resposta com o utilizador atualizado
      return res.status(200).json({ message: 'PushToken atualizado com sucesso', user: updatedUser });
    } catch (error) {
      console.error('Erro ao atualizar o pushToken:', error);
      return res.status(500).json({ error: 'Erro ao atualizar o pushToken', details: error.message });
    }
  };



  