// react-native-web: Alert.alert is an empty function → no dialog (sign-out confirmation, errors…) shows on web.
// Replaced by the browser's window.alert / window.confirm. Web only; native keeps the original Alert.
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);

    // No buttons → just a message
    if (actions.length === 0) {
      window.alert(text);
      cancel?.onPress?.();
      return;
    }

    // One button without Cancel → message, then run it
    if (actions.length === 1 && !cancel) {
      window.alert(text);
      actions[0].onPress?.();
      return;
    }

    // Cancel or several buttons → OK runs the first one (confirm has only 2 buttons)
    if (window.confirm(actions.length > 1 ? `${text}\n\n(OK = ${actions[0].text ?? 'OK'})` : text)) {
      actions[0].onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}
