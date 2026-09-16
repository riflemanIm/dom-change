import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import EditNoteRounded from '@mui/icons-material/EditNoteRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import PendingActionsRounded from '@mui/icons-material/PendingActionsRounded';
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import { Box } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { NotificationItem } from './notifications-api';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'neutral';

const tones: Record<Tone, { color: string; background: string; border: string }> = {
  blue: { color: '#2868a9', background: '#eef6ff', border: '#cfe4f8' },
  green: { color: '#18765f', background: '#edf8f3', border: '#cce9dd' },
  amber: { color: '#9a6408', background: '#fff7e8', border: '#f0dfb8' },
  red: { color: '#b43c38', background: '#fff1f0', border: '#f0cecb' },
  purple: { color: '#7651a8', background: '#f6f0fc', border: '#dfd1ee' },
  neutral: { color: '#62706d', background: '#f3f6f5', border: '#dce4e1' },
};

export function getNotificationAppearance(item: Pick<NotificationItem, 'type' | 'title'>) {
  const title = item.title.toLocaleLowerCase('ru');
  let tone: Tone = 'neutral';
  let Icon: SvgIconComponent = NotificationsNoneRounded;

  if (item.type === 'EXCHANGE_MESSAGE') {
    tone = 'blue';
    Icon = ChatBubbleOutlineRounded;
  } else if (item.type === 'EXCHANGE_REVIEW') {
    tone = 'purple';
    Icon = StarOutlineRounded;
  } else if (item.type === 'EXCHANGE_STATUS') {
    if (title.includes('отмен') || title.includes('отклон')) {
      tone = 'red';
      Icon = CancelRounded;
    } else if (title.includes('подтвержд') || title.includes('заверш')) {
      tone = 'green';
      Icon = CheckCircleRounded;
    } else {
      tone = 'blue';
      Icon = SwapHorizRounded;
    }
  } else if (item.type === 'PROPERTY_MODERATION_QUEUE') {
    tone = 'amber';
    Icon = PendingActionsRounded;
  } else if (item.type === 'PROPERTY_MODERATION') {
    if (title.includes('опубликовано')) {
      tone = 'green';
      Icon = CheckCircleRounded;
    } else if (title.includes('отклон')) {
      tone = 'red';
      Icon = CancelRounded;
    } else if (title.includes('изменен')) {
      tone = 'amber';
      Icon = EditNoteRounded;
    } else {
      tone = 'purple';
      Icon = FactCheckRounded;
    }
  } else if (item.type === 'POINTS_ADMIN_ADJUSTMENT') {
    tone = title.includes('списаны') ? 'red' : 'green';
    Icon = AccountBalanceWalletRounded;
  }

  return { ...tones[tone], Icon };
}

export function NotificationTypeIcon({ item, size = 38 }: { item: Pick<NotificationItem, 'type' | 'title'>; size?: number }) {
  const appearance = getNotificationAppearance(item);
  return (
    <Box sx={{ width: size, height: size, flex: '0 0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', color: appearance.color, bgcolor: '#fff', border: '1px solid', borderColor: appearance.border }}>
      <appearance.Icon sx={{ fontSize: size * 0.52 }} />
    </Box>
  );
}
