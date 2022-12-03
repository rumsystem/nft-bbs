
import React, { useRef } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import store from 'store2';
import QuorumLightNodeSDK, { IGroup } from 'quorum-light-node-sdk';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, OutlinedInput,
} from '@mui/material';
import { ChevronLeft, Close, Visibility, VisibilityOff } from '@mui/icons-material';
import PasteIcon from 'boxicons/svg/regular/bx-paste.svg?fill-icon';

import bgImg3x from '~/assets/images/rum_barrel_bg@3x.jpg';
import logoImg from '~/assets/icons/rumsystem.svg';
import RumLogo from '~/assets/icons/logo.png';
import RumLogo2x from '~/assets/icons/logo@2x.png';
import RumLogo3x from '~/assets/icons/logo@3x.png';
// import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';

import { ThemeLight } from '~/utils';
import { keyService, nodeService, snackbarService } from '~/service';
import { getDatabase } from '~/database';

enum Step {
  InputSeedUrl = 0,
  SeedUrlParsingError = 2,
  PrepareJoinGroup = 3,
}

export const Join = observer(() => {
  const state = useLocalObservable(() => ({
    seedUrl: 'rum://seed?v=1&e=0&n=0&b=48rNOzKfQKKysYm-Obes8w&c=XVs5w2f-8f36JbGOCgZFyQ16VR4HrK5S_k70ia64isU&g=_ztAsQEnTLSLStXu-t66TQ&k=Ajm4Z_Xaf_z70vhvuULp1EKWnY23SzF36xggiU_1CNBA&s=Rixby97Q3wXlRWJfvPVwuxHBp9pJnvN8yOyS2eTeDLV1vkSTRIu6uGtFZStEomIINdd42AtRQZQlSWiOACzycQA&t=Fwcqet61HME&a=%E8%81%8A%E5%A4%A9%E5%AE%A41&y=group_timeline&u=https://103.61.39.95?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6W10sImV4cCI6MTY5MDg3NTgxMiwibmFtZSI6Im5vZGUtYWxsLWdyb3VwcyIsInJvbGUiOiJjaGFpbiJ9.UOUcyCiu0mAjYDOpE-KyTCnKgoG-LlXhLBdLr8AXMyM',
    passwordPopup: false,
    privateKey: '',
    password: '',
    passwordVisibility: false,
    rememberPassword: false,
    group: null as null | IGroup,
    step: 0,
    languageMenu: false,
    get canLogin() {
      return !!this.password && !!this.privateKey;
    },
  }));

  // const languageButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // const handleChangeLanguage = action((lang: AllLanguages) => {
  //   langService.switchLang(lang);
  //   state.languageMenu = false;
  // });

  const handleNextStep = async () => {
    if (state.step === Step.InputSeedUrl) {
      try {
        QuorumLightNodeSDK.cache.Group.add(state.seedUrl);
        const groups = QuorumLightNodeSDK.cache.Group.list();
        const group = groups[0];
        groups.forEach((v) => {
          QuorumLightNodeSDK.cache.Group.remove(v.groupId);
        });
        runInAction(() => {
          state.group = group;
          state.step = Step.PrepareJoinGroup;
        });
      } catch (e) {
        snackbarService.error(`解析失败 (${(e as Error).message})`);
        runInAction(() => {
          state.step = Step.SeedUrlParsingError;
        });
      }
      return;
    }
    if (state.step === Step.PrepareJoinGroup) {
      try {
        await nodeService.joinGroup(state.seedUrl);
      } catch (e) {
        snackbarService.error(`加入失败 (${(e as Error).message})`);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      runInAction(() => {
        state.seedUrl = text;
      });
    } catch (e) {
      snackbarService.show('读取剪切板失败');
    }
  };

  const handleShowLoginDialog = action(() => {
    state.passwordPopup = true;
    state.privateKey = store('privateKey');
    state.password = store('password');
    state.rememberPassword = state.canLogin;
  });

  const handleLoginConfirm = async () => {
    let data;
    try {
      data = await keyService.validate(state.privateKey, state.password);
    } catch (e) {
      snackbarService.error('私钥或密码错误');
      return;
    }
    store('privateKey', state.privateKey);
    if (state.rememberPassword) {
      store('password', state.password);
    } else {
      store('password', '');
    }
    nodeService.joinGroup(state.seedUrl, data);
  };

  const handleLoginAnonymous = () => {
    nodeService.joinGroup(state.seedUrl);
    const db = getDatabase();
    db.clearAllTable();
  };

  const handleCreateNewWallet = async () => {
    if (!state.password) {
      snackbarService.show('请输入密码');
      return;
    }
    const data = await keyService.createRandom(state.password);
    runInAction(() => {
      state.privateKey = data.privateKey;
    });
    snackbarService.show('已创建新钱包，请保存好私钥和密码。');
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) { return; }
    const content = await file.text();
    runInAction(() => {
      state.seedUrl = content;
    });
  };

  return (<>
    <div className="min-h-[100vh] flex-col">
      <input
        type="file"
        hidden
        accept=".json,.txt"
        onChange={handleSelectFile}
        ref={fileInput}
      />
      <a
        className="text-black"
        target="_blank"
        rel="noopener"
        href="https://rumsystem.net/"
      >
        <img
          className="fixed top-12 left-12 flex-none w-8 h-auto"
          src={RumLogo}
          srcSet={`${RumLogo2x} 2x, ${RumLogo3x} 3x,`}
          alt=""
        />
      </a>
      <div className="fixed top-12 right-16 flex items-center flex-none">
        {/* <Button
          className="text-[#5fc0e9] px-4"
          variant="text"
          ref={languageButton}
          onClick={action(() => { state.languageMenu = true; })}
        >
          <LanguageIcon className="mr-3 text-cyan-blue text-20" />
          <span className="normal-case text-14">
            Language
          </span>
        </Button>

        <ThemeLight>
          <Menu
            className="mt-1"
            open={state.languageMenu}
            anchorEl={languageButton.current}
            onClose={action(() => { state.languageMenu = false; })}
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
        </ThemeLight> */}
      </div>
      <div
        className="flex-col flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgImg3x}')`,
        }}
      >
        <div className="flex flex-center flex-1">
          <div className="relative flex-col flex-center bg-black/70 w-[720px] h-[330px] rounded-[10px]">
            {state.step === Step.InputSeedUrl && (
              <div className="flex-col flex-center">
                <div className="text-white text-18">
                  加入 RumPot 种子网络
                </div>
                <OutlinedInput
                  className="text-white w-[440px] mt-12 pl-2"
                  value={state.seedUrl}
                  onChange={action((e) => { state.seedUrl = e.target.value; })}
                  endAdornment={(
                    <Button
                      className="flex flex-none text-white ml-2"
                      variant="text"
                      color="inherit"
                      onClick={handlePaste}
                    >
                      <PasteIcon className="text-20 mr-1" />
                      粘贴
                    </Button>
                  )}
                  placeholder="输入种子文本 Rum://"
                />

                <div className="flex gap-x-4 mt-12">
                  {/* <Button
                    className="text-16 px-4"
                    color="rum"
                    variant="text"
                    onClick={() => fileInput.current?.click()}
                  >
                    或导入本地种子文件
                  </Button> */}

                  <Button
                    className="text-16 rounded-full px-7"
                    color="rum"
                    variant="outlined"
                    onClick={handleNextStep}
                  >
                    加入
                  </Button>
                </div>
              </div>
            )}
            {state.step === 1 && (
              <div className="flex-col flex-center">
                <CircularProgress className="text-gray-70" size={48} />

                <div className="mt-12 text-white text-16">
                  rum://ablacadablablablablabla…
                </div>
                <div className="mt-12">
                  <Button
                    className="text-16 px-4"
                    color="rum"
                    variant="text"
                    onClick={action(() => { state.step += 1; })}
                  >
                    重新导入本地种子文件
                  </Button>
                </div>
              </div>
            )}
            {state.step === Step.SeedUrlParsingError && (
              <div className="flex-col flex-center">
                <div className="text-white">
                  种子文本解析错误
                </div>
                <div className="mt-12 text-white text-16">
                  {state.seedUrl}
                </div>
                <div className="text-[#f87171] text-16 mt-8">
                  种子文本有误，您可以：
                </div>
                <div className="text-16 mt-2">
                  <Button
                    className="text-16 px-3"
                    color="rum"
                    variant="text"
                    size="small"
                    onClick={action(() => { state.step = 0; })}
                  >
                    重新输入种子文本
                  </Button>
                  {/* <span className="text-gray-9c">
                    {' '}或{' '}
                  </span>
                  <Button
                    className="text-16 px-3"
                    color="rum"
                    variant="text"
                    size="small"
                    onClick={action(() => { state.step += 1; })}
                  >
                    重新导入本地种子文件
                  </Button> */}
                </div>
              </div>
            )}
            {state.step === Step.PrepareJoinGroup && (
              <div className="flex-col items-center pt-12">
                <Button
                  className="flex flex-center absolute left-2 top-2 text-14 font-normal text-gray-9c"
                  variant="text"
                  color="inherit"
                  onClick={action(() => { state.step = Step.InputSeedUrl; })}
                >
                  <ChevronLeft className="text-24 -mt-px" />
                  返回重新输入种子
                </Button>
                <div className="w-25 h-25 rounded-full overflow-hidden bg-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
                  <div className="bg-blue-400/70 rounded-full h-full w-full" />
                </div>
                <div className="mt-0 text-gray-f2 text-18 truncate max-w-[400px]">
                  {state.group?.groupName}
                </div>

                {/* <div className="mt-4 text-gray-f2 text-16 max-w-[320px] truncate-3">
                  种子网络的简介可以继续写继续写继续写继续写继续写继续写继续写继续写继续写继续写这么多字
                  种子网络的简介可以继续写继续写继续写继续写继续写继续写继续写继续写继续写继续写这么多字
                  种子网络的简介可以继续写继续写继续写继续写继续写继续写继续写继续写继续写继续写这么多字
                </div> */}
                <Button
                  className="text-rum-orange rounded-full text-16 px-12 py-2 mt-4"
                  color="inherit"
                  variant="outlined"
                  onClick={handleShowLoginDialog}
                >
                  注册/登录
                </Button>
                <button
                  className="text-gray-9c text-14 mt-4"
                  onClick={handleLoginAnonymous}
                >
                  以游客身份进入
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center px-10 h-12 bg-white">
        <img src={logoImg} alt="" />
        <span className="px-2">·</span>
        <div className="flex flex-center gap-x-12 text-14">
          {[
            ['https://rumsystem.net/', '关于'],
            ['https://rumsystem.net/developers', '文档'],
            ['https://rumsystem.net/faq/howtocreateseednet', '怎样创建 RumPot 种子网络？'],
          ].map((v, i) => (
            <a
              className="text-black"
              target="_blank"
              rel="noopener"
              href={v[0]}
              key={i}
            >
              {v[1]}
            </a>
          ))}
        </div>
      </div>
    </div>
    <ThemeLight>
      <Dialog
        open={state.passwordPopup}
        onClose={action(() => { state.passwordPopup = false; })}
      >
        {true && (
          <div className="flex-col relative text-black w-[400px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.passwordPopup = false; })}
            >
              <Close />
            </IconButton>
            <div className="flex-col flex-1 justify-between items-center p-6 gap-y-6">
              <div className="text-18">
                注册/登录
              </div>
              <div className="flex-col gap-y-4 w-[250px] items-stretch">
                <FormControl size="small">
                  <InputLabel>私钥</InputLabel>
                  <OutlinedInput
                    size="small"
                    label="私钥"
                    type="text"
                    multiline
                    rows={3}
                    value={state.privateKey}
                    onChange={action((e) => { state.privateKey = e.target.value; })}
                  />
                </FormControl>
                <FormControl size="small">
                  <InputLabel>密码</InputLabel>
                  <OutlinedInput
                    size="small"
                    label="密码"
                    type={state.passwordVisibility ? 'text' : 'password'}
                    value={state.password}
                    onChange={action((e) => { state.password = e.target.value; })}
                    endAdornment={(
                      <IconButton
                        className="-mr-2"
                        size="small"
                        onClick={action(() => { state.passwordVisibility = !state.passwordVisibility; })}
                      >
                        {state.passwordVisibility && (<Visibility className="text-20" />)}
                        {!state.passwordVisibility && (<VisibilityOff className="text-20" />)}
                      </IconButton>
                    )}
                  />
                </FormControl>
                <FormControlLabel
                  className="flex-center"
                  label="记住密码"
                  control={(
                    <Checkbox
                      checked={state.rememberPassword}
                      onChange={action((_, v) => { state.rememberPassword = v; })}
                    />
                  )}
                />
              </div>
              <div className="flex gap-x-4">
                <Button
                  className="rounded-full text-16 px-10 py-2"
                  color="primary"
                  variant="outlined"
                  onClick={handleCreateNewWallet}
                >
                  创建新钱包
                </Button>
                <Button
                  className="rounded-full text-16 px-10 py-2"
                  color="link"
                  variant="outlined"
                  onClick={handleLoginConfirm}
                  disabled={!state.canLogin}
                >
                  确定
                </Button>
              </div>
            </div>
          </div>
        )}
        {false && (
          <div className="flex-col relative w-[400px] h-[350px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.passwordPopup = false; })}
            >
              <Close />
            </IconButton>
            <div className="flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-4">
              <div className="text-16 font-medium">
                编辑身份资料
              </div>
              <div className="w-20 h-20 bg-black/20" />
              <FormControl size="small">
                <InputLabel>昵称</InputLabel>
                <OutlinedInput
                  label="昵称"
                  size="small"
                />
              </FormControl>
              <button className="text-gray-9c rounded-full text-14">
                暂时跳过
              </button>
              <Button
                className="rounded-full text-16 px-10 py-2"
                color="link"
                variant="outlined"
              >
                确定
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </ThemeLight>
  </>);
});
