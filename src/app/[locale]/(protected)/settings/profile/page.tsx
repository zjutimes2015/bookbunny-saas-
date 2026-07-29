import { UpdateAvatarCard } from '@/components/settings/profile/update-avatar-card';
import { UpdateNameCard } from '@/components/settings/profile/update-name-card';
import { UpdateTwitterCard } from '@/components/settings/profile/update-twitter-card';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UpdateNameCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UpdateTwitterCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UpdateAvatarCard />
      </div>
    </div>
  );
}
