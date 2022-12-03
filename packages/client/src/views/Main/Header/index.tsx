import React, { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import store from 'store2';
import { ethers } from 'ethers';
import QuorumLightNodeSDK from 'quorum-light-node-sdk';
import { Check, Close, MoreVert, NotificationsNone, Search } from '@mui/icons-material';
import {
  Badge, Button, FormControl, IconButton, Input,
  InputLabel, Menu, MenuItem, OutlinedInput, Popover, Tab, Tabs,
} from '@mui/material';

import CamaraIcon from 'boxicons/svg/regular/bx-camera.svg?fill-icon';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import RumLogo from '~/assets/icons/logo.png';
import RumLogo2x from '~/assets/icons/logo@2x.png';
import RumLogo3x from '~/assets/icons/logo@3x.png';
// import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';
import { ThemeLight } from '~/utils';
import {
  nodeService, langService, viewService, keyService,
  AllLanguages, langName, HotestFilter, dialogService,
} from '~/service';
import { editProfile } from '~/modals';
import { ACCOUNT1, ACCOUNT2 } from '~/utils/testAccount';
import { UserAvatar } from '~/components';

export const Header = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    tab: 0,
    userDropdown: false,
    searchTerm: '',
    searchMode: false,
    menu: false,
    langMenu: false,
    filter: 'all' as HotestFilter,

    get viewPage() {
      return viewService.state.page.page.name;
    },
    get profile() {
      return nodeService.state.myProfile;
    },
  }));

  const userBoxRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const handleChangeLanguage = action((lang: AllLanguages) => {
    langService.switchLang(lang);
    state.langMenu = false;
  });

  const handleChangeFilter = action((filter: HotestFilter) => {
    state.filter = filter;
    nodeService.post.list({ filter });
  });

  const handleChangeTab = action((tab: number) => {
    state.tab = tab;
    if (state.tab === 0) {
      nodeService.post.list();
    } else {
      nodeService.post.list({ filter: state.filter });
    }
  });

  const handleSearchInputKeydown = action((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.searchTerm) {
      nodeService.post.list({ search: state.searchTerm });
    }
    if (e.key === 'Escape') {
      handleExitSearchMode();
    }
  });

  const handleOpenSearchInput = action(() => {
    state.searchMode = !state.searchMode;
    setTimeout(() => {
      searchInput.current?.focus();
    });
  });

  const handleExitSearchMode = action(() => {
    state.searchMode = false;
    if (nodeService.state.post.mode.type === 'search') {
      if (state.tab === 0) {
        nodeService.post.list();
      } else {
        nodeService.post.list({ filter: state.filter });
      }
    }
  });

  const handleEditProfile = action(() => {
    state.userDropdown = false;
    editProfile({
      avatar: state.profile?.avatar ?? '',
      name: state.profile?.name ?? '',
      intro: state.profile?.intro ?? '',
    });
  });

  const handleOpenUserProfile = action(() => {
    state.userDropdown = false;
    if (
      viewService.state.page.page.name === 'userprofile'
      && viewService.state.page.page.value.userAddress === state.profile?.userAddress
    ) {
      return;
    }
    if (!state.profile) {
      viewService.pushPage({
        name: 'userprofile',
        value: {
          trxId: '',
          avatar: '',
          userAddress: keyService.state.address,
          groupId: nodeService.state.groupId,
          name: '',
          intro: '',
        },
      });
    } else {
      viewService.pushPage({
        name: 'userprofile',
        value: state.profile,
      });
    }
  });

  const handleChangeAccount = async (type: '1' | '2' | 'new') => {
    let wallet;
    if (type === '1') {
      const privateKey = ACCOUNT1.privateKey;
      wallet = new ethers.Wallet(privateKey);
    } else if (type === '2') {
      const privateKey = ACCOUNT2.privateKey;
      wallet = new ethers.Wallet(privateKey);
    } else {
      wallet = ethers.Wallet.createRandom();
    }
    const password = '123';
    const keystore = await wallet.encrypt(password, {
      scrypt: {
        N: 64,
      },
    });
    store('keystore', keystore);
    store('password', password);
    QuorumLightNodeSDK.cache.Group.clear();
    window.location.reload();
  };

  const handleClearData = () => {
    window.location.reload();
  };

  const handleShowAccountInfo = () => {
    dialogService.open({
      title: '账号信息',
      content: (
        <div className="flex-col gap-y-4 py-2 w-[400px]">
          <FormControl size="small">
            <InputLabel>keystore</InputLabel>
            <OutlinedInput
              className="text-14 break-all"
              size="small"
              label="keystore"
              type="text"
              multiline
              rows={10}
              onFocus={(e) => e.target.select()}
              value={keyService.state.keystore}
            />
          </FormControl>
          <FormControl size="small">
            <InputLabel>password</InputLabel>
            <OutlinedInput
              size="small"
              label="keystore"
              type="text"
              multiline
              onFocus={(e) => e.target.select()}
              value={keyService.state.password}
            />
          </FormControl>
        </div>
      ),
      noCancelButton: true,
      maxWidth: 0,
    });
  };

  const handleLogin = action(() => {
    if (window.location.pathname !== '/') {
      history.replaceState(null, '', '/');
    }

    state.userDropdown = false;
    store('seedUrlAutoJoin', false);
    window.location.reload();
  });

  const handleLogout = action(() => {
    state.userDropdown = false;
    store.remove('password');
    store.remove('keystore');
    QuorumLightNodeSDK.cache.Group.clear();
    handleClearData();
  });

  const handleExitGroup = () => {
    store('seedUrlAutoJoin', false);
    window.location.reload();
  };

  const handleClickLogo = () => {
    viewService.backToTop();
    nodeService.post.list();
  };

  return (<>
    <div className="h-[60px]" />
    <div
      className={classNames(
        'fixed top-0 left-0 right-0 z-50 flex flex-center px-5 h-[60px] bg-[#0d1d37] bg-white',
        props.className,
      )}
    >
      <button
        className="absolute left-5 flex-none w-7 h-auto s1240:hidden"
        onClick={handleClickLogo}
      >
        <img
          className=""
          src={RumLogo}
          srcSet={`${RumLogo2x} 2x, ${RumLogo3x} 3x,`}
          alt=""
        />
      </button>
      <div className="flex w-[1100px] justify-between self-stretch gap-x-4">
        <div className="flex items-center flex-1">
          <button
            className="flex-none h-auto hidden s1240:block self-center mr-4"
            onClick={handleClickLogo}
          >
            <img
              className="w-7 h-auto self-center"
              src={RumLogo}
              srcSet={`${RumLogo2x} 2x, ${RumLogo3x} 3x,`}
              alt=""
            />
          </button>
          {!state.searchMode && state.viewPage === 'postlist' && (
            <div className="flex gap-x-4">
              {false && (
                <Tabs
                  value={state.tab}
                  TabIndicatorProps={{ className: '!bg-rum-orange h-[3px]' }}
                >
                  {/* {['最新', '最热'].map((v, i) => ( */}
                  {['最新'].map((v, i) => (
                    <Tab
                      className="text-gray-9c text-20 h-[60px] px-8"
                      classes={{ selected: '!text-rum-orange' }}
                      label={v}
                      key={i}
                      onClick={() => handleChangeTab(i)}
                    />
                  ))}
                </Tabs>
              )}
              {state.tab === 1 && (
                <div className="flex flex-center gap-x-2">
                  {([['周', 'week'], ['月', 'month'], ['年', 'year'], ['一直', 'all']] as const).map(([t, v], i) => (
                    <Button
                      className={classNames(
                        'min-w-0 px-4',
                        state.filter === v && 'text-rum-orange',
                        state.filter !== v && 'text-gray-9c',
                      )}
                      key={i}
                      color="inherit"
                      variant="text"
                      disableRipple
                      onClick={() => handleChangeFilter(v)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {state.viewPage !== 'postlist' && (
            <div className="" />
          )}

          {state.searchMode && state.viewPage === 'postlist' && (
            <div className="flex flex-1 items-center">
              <Input
                className="flex-1 max-w-[550px] text-white text-14 pb-px"
                sx={{
                  '&:hover:not(.Mui-disabled)::before': { borderColor: '#9c9c9c' },
                  '&::before': { borderColor: '#9c9c9c' },
                  '&::after': { borderColor: 'white' },
                  '& .MuiInput-input::placeholder': { color: '#9c9c9c', opacity: 1 },
                }}
                startAdornment={<Search className="text-gray-9c mr-1 text-26" />}
                placeholder="搜索种子网络…"
                value={state.searchTerm}
                onChange={(action((e) => { state.searchTerm = e.target.value; }))}
                onKeyDown={handleSearchInputKeydown}
                inputProps={{ ref: searchInput }}
              />
              <IconButton onClick={handleExitSearchMode}>
                <Close className="text-white" />
              </IconButton>
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-4">
          <div className="flex justify-end items-center gap-x-4 mr-8">
            {[
              // {
              //   key: 'share',
              //   icon: <Share className="text-24" />,
              //   onClick: () => 1,
              //   active: false,
              // },
              state.viewPage === 'postlist' && {
                key: 'search',
                icon: <Search className="text-28" />,
                onClick: handleOpenSearchInput,
                active: state.searchMode,
              },
              nodeService.state.logined && {
                key: 'notification',
                icon: (
                  <Badge
                    className="transform"
                    classes={{ badge: 'bg-red-500 text-white' }}
                    badgeContent={nodeService.state.notification.unreadCount}
                  >
                    <NotificationsNone className="text-26" />
                  </Badge>
                ),
                onClick: () => {
                  if (state.viewPage === 'notification') {
                    viewService.back();
                  } else {
                    viewService.pushPage({ name: 'notification' });
                  }
                },
                active: state.viewPage === 'notification',
              },
            ].filter(<T extends unknown>(v: T | false): v is T => !!v).map((v) => (
              <Button
                className={classNames(
                  'text-white p-0 w-10 h-10 min-w-0',
                  v.active && 'bg-white/10 hover:bg-white/15',
                )}
                onClick={v.onClick}
                variant="text"
                key={v.key}
              >
                {v.icon}
              </Button>
            ))}
          </div>

          {!nodeService.state.logined && (
            <Button
              className="rounded-full py-px px-5 text-16"
              color="rum"
              onClick={handleLogin}
            >
              登录
            </Button>
          )}
          <div
            className="flex flex-center gap-x-3 cursor-pointer"
            ref={userBoxRef}
            onClick={action(() => {
              if (nodeService.state.logined) {
                state.userDropdown = true;
              }
            })}
          >
            <UserAvatar profile={nodeService.state.myProfile} />
            <span className="text-white">
              {nodeService.state.logined ? nodeService.state.profileName : '游客'}
            </span>
          </div>
          <IconButton
            className="text-white"
            onClick={action(() => { state.menu = true; })}
            ref={menuButton}
          >
            <MoreVert />
          </IconButton>
        </div>
      </div>
    </div>

    <ThemeLight>
      <Popover
        className="mt-4"
        open={state.userDropdown}
        onClose={action(() => { state.userDropdown = false; })}
        anchorEl={userBoxRef.current}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        <div className="flex-col items-center w-[240px]">
          <button
            className="relative group w-12 h-12 mt-6 cursor-pointer rounded-full"
            onClick={handleEditProfile}
          >
            <UserAvatar
              className="shadow-2"
              size={48}
              profile={nodeService.state.myProfile}
            >
              <div className="absolute right-0 bottom-0 border-black border rounded-full bg-white p-px hidden group-hover:block">
                <CamaraIcon className="text-12" />
              </div>
            </UserAvatar>
          </button>
          <button
            className="mt-4 cursor-pointer flex flex-center"
            onClick={handleEditProfile}
          >
            <span className="align-center truncate max-w-[200px]">
              {nodeService.state.profileName}
            </span>
            <EditAltIcon className="inline-block text-17" />
          </button>
          <Button
            className="rounded-full font-normal pb-0 pt-px px-8 mt-4 text-12"
            variant="outlined"
            color="link"
            onClick={handleOpenUserProfile}
          >
            我的主页
          </Button>
          <Button
            className="rounded-none w-full border-solid border-t border-black/10 mt-6 h-12 font-normal text-14"
            variant="text"
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </Popover>

      <Menu
        className="mt-1"
        open={state.menu}
        anchorEl={menuButton.current}
        onClose={action(() => { state.menu = false; })}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        {/* <MenuItem onClick={action(() => { state.menu = false; state.langMenu = true; })}>
          <div className="flex gap-x-3 mr-2">
            <LanguageIcon className="text-black text-20" />
            <div className="flex-col gap-y-[2px]">
              <div className="text-14">
                Language
              </div>
              <div className="text-12 text-gray-9c">
                {langService.state.langName}
              </div>
            </div>
          </div>
        </MenuItem> */}
        {([
          { text: '我的账号信息', onClick: handleShowAccountInfo },
          process.env.NODE_ENV === 'development' && { text: '使用账号1', onClick: () => handleChangeAccount('1') },
          process.env.NODE_ENV === 'development' && { text: '使用账号2', onClick: () => handleChangeAccount('2') },
          // process.env.NODE_ENV === 'development' && { text: '使用新号', onClick: () => handleChangeAccount('new') },
          !!nodeService.state.group && { text: '退出种子网络', onClick: handleExitGroup },
        ] as const).filter(<T extends unknown>(v: T | false): v is T => !!v).map((v, i) => (
          <MenuItem onClick={v.onClick} key={i}>
            <div className="flex gap-x-3 mr-2">
              {v.text}
            </div>
          </MenuItem>
        ))}
        {/* <MenuItem onClick={() => handleChangeAccount('1')}>
          <div className="flex gap-x-3 mr-2">
            asd
          </div>
        </MenuItem>
        {process.env.NODE_ENV === 'development' && [
          <MenuItem onClick={() => handleChangeAccount('1')}>
            <div className="flex gap-x-3 mr-2">
              使用账号1
            </div>
          </MenuItem>,
          <MenuItem onClick={() => handleChangeAccount('2')}>
            <div className="flex gap-x-3 mr-2">
              使用账号2
            </div>
          </MenuItem>,
          <MenuItem onClick={() => handleChangeAccount('new')}>
            <div className="flex gap-x-3 mr-2">
              使用新号
            </div>
          </MenuItem>,
          <MenuItem onClick={() => handleClearData()}>
            <div className="flex gap-x-3 mr-2">
              清除数据
            </div>
          </MenuItem>,
        ]} */}
      </Menu>

      <Menu
        className="mt-1"
        open={state.langMenu}
        anchorEl={menuButton.current}
        onClose={action(() => { state.langMenu = false; })}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        <MenuItem onClick={() => handleChangeLanguage('en')}>
          <div className="flex flex-center w-5 mr-2">
            {langService.state.lang === 'en' && (
              <Check className="text-20 text-soft-blue" />
            )}
          </div>
          {langName.en}
        </MenuItem>
        <MenuItem onClick={() => handleChangeLanguage('zh-cn')}>
          <div className="flex flex-center w-5 mr-2">
            {langService.state.lang === 'zh-cn' && (
              <Check className="text-20 text-soft-blue" />
            )}
          </div>
          {langName['zh-cn']}
        </MenuItem>
      </Menu>
    </ThemeLight>
  </>);
});