/**
 * Mock para @sayem314/react-native-keep-awake
 *
 * Este mock substitui o módulo nativo que não está compilado no dev client.
 * O TurboModule 'ReactNativeKCKeepAwake' não existe no binary atual, portanto
 * usamos no-ops para que o Zegocloud SDK funcione sem crashar.
 *
 * O ecrã pode adormecer durante chamadas, mas a app funciona normalmente.
 * Para corrigir permanentemente: rebuild com `expo run:android`.
 */

import React from 'react';
import { useEffect } from 'react';

export function activateKeepAwake() {
  // no-op: nativo não disponível no dev client atual
}

export function deactivateKeepAwake() {
  // no-op: nativo não disponível no dev client atual
}

export function useKeepAwake() {
  useEffect(() => {
    activateKeepAwake();
    return () => deactivateKeepAwake();
  }, []);
}

export default function KeepAwake() {
  useKeepAwake();
  return null;
}
