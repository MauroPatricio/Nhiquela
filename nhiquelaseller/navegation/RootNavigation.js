// RootNavigation.js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Função global para navegar de qualquer lugar da aplicação,
 * mesmo fora de componentes React.
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    console.warn('navigationRef não está pronto para navegar.');
  }
}
