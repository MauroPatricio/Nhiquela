import axios from 'axios';
import * as crypto from 'crypto';

interface PayoutPayload {
  amount: number;
  phoneNumber: string;
  referenceId: string;
}

interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export class MobileMoneyService {
  private static MPESA_API_URL = process.env.MPESA_API_URL || 'https://api.sandbox.vm.co.mz:18352/ipg/v1x/b2c/';
  private static MPESA_PUBLIC_KEY = process.env.MPESA_PUBLIC_KEY || 'SUA_CHAVE_PUBLICA_RSA_M_PESA_AQUI';
  private static MPESA_API_KEY = process.env.MPESA_API_KEY || 'SEU_API_KEY';
  private static MPESA_SERVICE_PROVIDER_CODE = process.env.MPESA_SERVICE_PROVIDER_CODE || '171717';

  private static generateMpesaToken(): string {
    try {
      const buffer = Buffer.from(this.MPESA_API_KEY);
      const encrypted = crypto.publicEncrypt(
        {
          key: `-----BEGIN PUBLIC KEY-----\n${this.MPESA_PUBLIC_KEY}\n-----END PUBLIC KEY-----`,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer
      );
      return encrypted.toString('base64');
    } catch (error: any) {
      throw new Error(`Falha ao criptografar Token M-Pesa: ${error.message}`);
    }
  }

  public static async executeMpesaPayout(payload: PayoutPayload): Promise<PaymentGatewayResponse> {
    if (process.env.NODE_ENV !== 'production') {
      return this.simulateLocalPayout(payload, 'M-Pesa');
    }

    try {
      const bearerToken = this.generateMpesaToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'developer.mpesa.vm.co.mz'
      };

      const cleanPhone = payload.phoneNumber.replace('+', '');

      const body = {
        input_TransactionReference: payload.referenceId.substring(0, 12),
        input_CustomerMSISDN: cleanPhone,
        input_Amount: payload.amount.toString(),
        input_ThirdPartyReference: payload.referenceId.substring(0, 12),
        input_ServiceProviderCode: this.MPESA_SERVICE_PROVIDER_CODE
      };

      const response = await axios.post(this.MPESA_API_URL, body, { headers, timeout: 15000 });

      if (response.data && response.data.output_ResponseCode === 'INS-0') {
        return {
          success: true,
          transactionId: response.data.output_TransactionID
        };
      } else {
        return {
          success: false,
          errorMessage: response.data?.output_ResponseDesc || 'Transação rejeitada pelo M-Pesa.'
        };
      }
    } catch (error: any) {
      console.error('Erro na chamada da API M-Pesa:', error.response?.data || error.message);
      return {
        success: false,
        errorMessage: error.response?.data?.output_ResponseDesc || error.message || 'Falha de comunicação externa.'
      };
    }
  }

  public static async executeEmolaPayout(payload: PayoutPayload): Promise<PaymentGatewayResponse> {
    if (process.env.NODE_ENV !== 'production') {
      return this.simulateLocalPayout(payload, 'e-Mola');
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.EMOLA_USER}:${process.env.EMOLA_PASS}`).toString('base64')}`
      };

      const body = {
        amount: payload.amount,
        receiver: payload.phoneNumber.replace('+', ''),
        ref: payload.referenceId,
        serviceCode: process.env.EMOLA_SERVICE_CODE
      };

      const response = await axios.post(process.env.EMOLA_API_URL || '', body, { headers, timeout: 15000 });

      if (response.data && response.data.status === 'SUCCESS') {
        return {
          success: true,
          transactionId: response.data.txId
        };
      } else {
        return {
          success: false,
          errorMessage: response.data.message || 'Rejeitado pela e-Mola.'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Falha de comunicação e-Mola.'
      };
    }
  }

  private static async simulateLocalPayout(payload: PayoutPayload, gateway: 'M-Pesa' | 'e-Mola'): Promise<PaymentGatewayResponse> {
    console.log(`[SIMULADOR ${gateway}] Processando levantamento de ${payload.amount} MT para ${payload.phoneNumber}...`);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!payload.phoneNumber.startsWith('25884') && !payload.phoneNumber.startsWith('25885') && gateway === 'M-Pesa') {
      return {
        success: false,
        errorMessage: 'Prefixo inválido para M-Pesa. Deve começar com 25884 ou 25885.'
      };
    }

    if (!payload.phoneNumber.startsWith('25886') && !payload.phoneNumber.startsWith('25887') && gateway === 'e-Mola') {
      return {
        success: false,
        errorMessage: 'Prefixo inválido para e-Mola. Deve começar com 25886 ou 25887.'
      };
    }

    const mockTxId = `TX_${gateway.toUpperCase()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    return {
      success: true,
      transactionId: mockTxId
    };
  }
}
