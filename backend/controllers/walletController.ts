import { Request, Response } from 'express';
import { MobileMoneyService } from '../services/mobileMoneyService';

// Mock in-memory database para fins demonstrativos e operacionais locais
let mockBalances = {
  available: 2450.00,
  pending: 680.00
};

let mockTransactions = [
  {
    id: 'tx-001',
    type: 'credit',
    amount: 1500.00,
    description: 'Crédito de Entrega - Pedido #4088',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'tx-002',
    type: 'credit',
    amount: 80.00,
    description: 'Comissão de Entrega - Pedido #4089',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'tx-003',
    type: 'debit',
    amount: 500.00,
    description: 'Levantamento de Fundos - M-Pesa',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'tx-004',
    type: 'credit',
    amount: 1370.00,
    description: 'Crédito de Venda - Pedido #3991',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export class WalletController {
  
  public static async getBalance(req: Request, res: Response) {
    try {
      // Retorna o saldo disponível e pendente do utilizador autenticado
      return res.status(200).json({
        available_balance: mockBalances.available,
        pending_balance: mockBalances.pending,
        currency: 'MZN'
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Erro ao consultar saldo.', error: error.message });
    }
  }

  public static async getTransactions(req: Request, res: Response) {
    try {
      // Retorna a lista de transações financeiras ordenada por data decrescente
      return res.status(200).json(mockTransactions);
    } catch (error: any) {
      return res.status(500).json({ message: 'Erro ao listar transações.', error: error.message });
    }
  }

  public static async getDriverEarnings(req: Request, res: Response) {
    try {
      // Retorna resumo de ganhos diários e semanais para motoristas/entregadores
      return res.status(200).json({
        today: 750.00,
        week: 4850.00,
        currency: 'MZN'
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Erro ao obter ganhos do motorista.', error: error.message });
    }
  }

  public static async requestWithdrawal(req: Request, res: Response) {
    const { amount, phone } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Valor de levantamento inválido.' });
    }

    if (amount > mockBalances.available) {
      return res.status(400).json({ message: 'Saldo disponível insuficiente.' });
    }

    if (!phone || phone.length < 9) {
      return res.status(400).json({ message: 'Número de telefone de destino inválido.' });
    }

    try {
      // 1. Calcular Taxas (Ex: 1% de comissão de levantamento para Nhiquela)
      const fee = amount * 0.01;
      const netAmount = amount - fee;
      const referenceId = `WDL_${Math.floor(100000 + Math.random() * 900000)}`;

      console.log(`\n==================================================`);
      console.log(`[LEDGER DOUBLE-ENTRY] Iniciando Split de Levantamento ${referenceId}`);
      console.log(`Débito Total Solicitado: -${amount.toFixed(2)} MT (Carteira de Origem)`);
      console.log(`Taxa Retida (Nhiquela 1%): +${fee.toFixed(2)} MT (Creditado a Nhiquela)`);
      console.log(`Valor Líquido a Enviar via B2C: +${netAmount.toFixed(2)} MT (M-Pesa/e-Mola)`);
      console.log(`==================================================\n`);

      // 2. Determinar gateway a usar com base no número
      const gateway = phone.startsWith('25886') || phone.startsWith('25887') ? 'e-Mola' : 'M-Pesa';

      // 3. Chamar adaptador B2C correspondente
      let payoutResult;
      if (gateway === 'e-Mola') {
        payoutResult = await MobileMoneyService.executeEmolaPayout({ amount: netAmount, phoneNumber: phone, referenceId });
      } else {
        payoutResult = await MobileMoneyService.executeMpesaPayout({ amount: netAmount, phoneNumber: phone, referenceId });
      }

      if (payoutResult.success) {
        // 4. Se der sucesso, efetivar lançamentos de débito na contabilidade
        mockBalances.available -= amount;

        const newLedgerDebitEntry = {
          id: referenceId,
          type: 'debit' as const,
          amount: amount,
          description: `Levantamento ${gateway} (Líquido: ${netAmount.toFixed(2)} MT, Taxa Nhiquela: ${fee.toFixed(2)} MT)`,
          created_at: new Date().toISOString()
        };

        mockTransactions.unshift(newLedgerDebitEntry);

        console.log(`[LEDGER SUCCESS] Registro salvo e saldo debitado com sucesso.`);

        return res.status(200).json({
          message: `Levantamento de ${netAmount.toFixed(2)} MT processado com sucesso para ${phone}! Taxa cobrada: ${fee.toFixed(2)} MT.`,
          transactionId: payoutResult.transactionId
        });
      } else {
        console.error(`[LEDGER FAILED] Falha ao processar saque: ${payoutResult.errorMessage}`);
        return res.status(400).json({
          message: payoutResult.errorMessage || 'Falha ao realizar transferência B2C via operadora.'
        });
      }

    } catch (error: any) {
      console.error('Erro geral no controlador de levantamentos:', error.message);
      return res.status(500).json({ message: 'Erro interno ao processar levantamento.', error: error.message });
    }
  }
}
