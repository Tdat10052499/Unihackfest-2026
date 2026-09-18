import { useState, useEffect } from 'react';
import { useTranslation } from '@/services/i18n';

export type TimeOfDay = 'day' | 'night';

/**
 * Lấy trạng thái thời gian trong ngày dựa trên giờ địa phương:
 * - Ban ngày (Day): Từ 06:00 đến 17:59 (6 <= hour < 18)
 * - Ban đêm (Night): Từ 18:00 đến 05:59 sáng hôm sau (hour >= 18 || hour < 6)
 */
export function getTimeOfDay(): TimeOfDay {
  const hours = new Date().getHours();
  if (hours >= 6 && hours < 18) {
    return 'day';
  }
  return 'night';
}

/**
 * Lấy lời chào theo mốc thời gian:
 * - Sáng (Morning): 05:00 - 11:59 -> "Good Morning"
 * - Chiều (Afternoon): 12:00 - 17:59 -> "Good Afternoon"
 * - Tối / Đêm (Evening): 18:00 - 04:59 -> "Good Evening"
 */
export function getTimeGreeting(t: any): string {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 12) {
    return t ? t('home.goodMorning', { defaultValue: 'Good Morning' }) : 'Good Morning';
  } else if (hours >= 12 && hours < 18) {
    return t ? t('home.goodAfternoon', { defaultValue: 'Good Afternoon' }) : 'Good Afternoon';
  } else {
    return t ? t('home.goodEvening', { defaultValue: 'Good Evening' }) : 'Good Evening';
  }
}

/**
 * Custom hook quản lý trạng thái thời gian thực tế của thiết bị và câu chào động.
 * Tự động đồng bộ và cập nhật mỗi phút.
 */
export function useTimeOfDay() {
  const { t } = useTranslation();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay);
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting(t));

  useEffect(() => {
    const update = () => {
      setTimeOfDay(getTimeOfDay());
      setGreeting(getTimeGreeting(t));
    };
    // Cập nhật giá trị ban đầu
    update();

    // Cập nhật định kỳ mỗi phút
    const interval = setInterval(update, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    timeOfDay,
    isDay: timeOfDay === 'day',
    isNight: timeOfDay === 'night',
    greeting,
  };
}
