// react-native-web: Alert.alert là hàm rỗng → mọi hộp thoại (xác nhận đăng xuất, báo lỗi…) không hiện trên web.
// Thay bằng window.alert / window.confirm của trình duyệt. Chỉ chạy trên web; native giữ nguyên Alert gốc.
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);

    // Không có lựa chọn → chỉ thông báo
    if (actions.length === 0) {
      window.alert(text);
      cancel?.onPress?.();
      return;
    }

    // Một lựa chọn không kèm Cancel → thông báo rồi chạy luôn
    if (actions.length === 1 && !cancel) {
      window.alert(text);
      actions[0].onPress?.();
      return;
    }

    // Có Cancel hoặc nhiều lựa chọn → OK chạy lựa chọn đầu tiên (confirm chỉ có 2 nút)
    if (window.confirm(actions.length > 1 ? `${text}\n\n(OK = ${actions[0].text ?? 'OK'})` : text)) {
      actions[0].onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}
