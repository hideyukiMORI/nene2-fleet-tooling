// shared/ui プローブ: i18n import 禁止（R1②）＋base 禁止群が消えていないこと（axios）
import axios from 'axios';
import { t } from '@/shared/i18n';

export function UiProbe() {
  return <button aria-label={t('common.close')}>{String(axios)}</button>;
}
