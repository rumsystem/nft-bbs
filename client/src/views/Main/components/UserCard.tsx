import { useEffect } from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import type { Profile } from 'nft-bbs-server';
import { Button } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { nodeService, viewService } from '~/service';
import { UserAvatar } from '~/components';

interface Props {
  className?: string
  profile?: Profile | null
}

export const UserCard = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    get profile() {
      return nodeService.profile.getComputedProfile(props.profile ?? '');
    },
    get fistPostTime() {
      const userAddress = state.profile?.userAddress;
      if (!userAddress) { return null; }
      return nodeService.state.profile.firstPostMap.get(userAddress) ?? null;
    },
    get totalPosts() {
      const userAddress = state.profile?.userAddress;
      if (!userAddress) { return 0; }
      return nodeService.state.profile.userPostCountMap.get(userAddress) ?? 0;
    },
  }));

  const loadUserData = () => {
    const userAddress = props.profile?.userAddress;
    if (!userAddress) { return; }
    nodeService.profile.getUserInfo(userAddress);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <div className={classNames('flex-col relative bg-black/70 py-5 px-5', props.className)}>
      <div
        className="flex items-center self-stretch cursor-pointer"
        onClick={() => state.profile && viewService.pushPage('userprofile', state.profile)}
      >
        <UserAvatar className="mr-3" profile={state.profile} size={48} />
        <div className="text-rum-orange text-16 flex-1">
          {state.profile?.name || state.profile?.userAddress.slice(0, 10)}
        </div>
        <ChevronRight className="text-link-soft text-26 -mr-2" />
      </div>
      <div className="text-gray-9c text-14 mt-3">
        {state.profile?.intro}
      </div>
      <div className="border-t border-white/45 mt-4 w-full" />
      <div className="mt-4 text-white text-14">
        {!!state.fistPostTime && `加入于 ${format(state.fistPostTime, 'yyyy-MM')}`}
        {!!state.fistPostTime && ' · '}
        共发表 {state.totalPosts} 帖
      </div>
      {false && (
        <Button
          className="rounded-full text-16 px-5 py-1 mt-6 self-center"
          variant="outlined"
          color="rum"
        >
          <WineIcon className="text-22 mr-3 mb-px" />
          给TA买一杯
        </Button>
      )}
    </div>
  );
});