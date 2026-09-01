import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

/**
 * TermsModal – shows terms and conditions that the user must accept before submitting an order.
 * Props:
 *   open: boolean – controls visibility.
 *   onClose: function – called when the user closes the modal (accepts).
 */
export default function TermsModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Termos e Condições</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Ao enviar o pedido, você concorda que o documento será processado pelos nossos serviços de OCR e que
          as informações fornecidas serão armazenadas de acordo com nossa política de privacidade.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          • O processamento pode levar até 5 minutos.
          <br />• Taxas de processamento são cobradas conforme a configuração da sua filial.
          <br />• Cancelamentos devem ser solicitados dentro de 30 minutos após a criação.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Leia a política completa em nosso site antes de prosseguir.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Concordo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
