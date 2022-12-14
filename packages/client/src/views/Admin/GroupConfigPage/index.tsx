import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { function as fp, taskEither } from 'fp-ts';
import { utils } from 'quorum-light-node-sdk';
import {
  Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, TextField, Tooltip,
} from '@mui/material';
import type { GroupConfig, GroupStatus } from 'nft-bbs-server/orm';

import { ConfigApi, GroupApi } from '~/apis';
import { runLoading, ThemeLight } from '~/utils';
import { dialogService, keyService, nodeService, snackbarService } from '~/service';
import { LoadingButton } from '@mui/lab';
import classNames from 'classnames';

export const GroupConfigPage = observer(() => {
  const state = useLocalObservable(() => ({
    groups: [] as Array<GroupStatus>,
    list: [] as Array<GroupConfig>,
    loading: false,

    setGroupConfigDialog: {
      open: false,
      loading: false,
      name: '',

      groupId: 0,
      keystore: false,
      mixin: false,
      metamask: false,
      anonymous: false,
      nft: '',
    },

    get zipped() {
      return this.groups.map((v) => {
        const seed = utils.restoreSeedFromUrl(v.mainSeedUrl);
        const config = this.list.find((u) => u.groupId === v.id);
        return {
          group: v,
          shortName: v.shortName,
          seedName: seed.group_name,
          config,
        };
      });
    },
  }));

  const loadData = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await Promise.all([
          fp.pipe(
            taskEither.fromTask(() => keyService.getSignParams()),
            taskEither.chainW((admin) => () => GroupApi.listAll(admin)),
            taskEither.map(action((v) => {
              state.groups = v;
            })),
          )(),
          fp.pipe(
            async () => ConfigApi.list({
              ...await keyService.getSignParams(),
            }),
            taskEither.map(action((v) => {
              state.list = v;
            })),
          )(),
        ]);
      },
    );
  };

  const handleCancel = action(() => {
    state.setGroupConfigDialog.open = false;
  });

  const handleEdit = action((group: GroupStatus, config?: GroupConfig) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    state.setGroupConfigDialog = {
      open: true,
      loading: false,
      name: group.shortName || seed.group_name || seed.group_id,
      groupId: group.id,
      keystore: config?.keystore ?? nodeService.state.config.defaultGroup.keystore ?? false,
      mixin: config?.mixin ?? nodeService.state.config.defaultGroup.mixin ?? false,
      metamask: config?.metamask ?? nodeService.state.config.defaultGroup.metamask ?? false,
      anonymous: config?.anonymous ?? nodeService.state.config.defaultGroup.anonymous ?? false,
      nft: config?.nft ?? '',
    };
  });

  const handleDelete = async (group: GroupStatus, config: GroupConfig) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    const result = await dialogService.open({
      title: '??????????????????',
      content: `??????????????????????????????????????????(?????????????????????)(${group.shortName || seed.group_name})`,
    });
    if (result === 'cancel') { return; }
    await ConfigApi.del({
      ...await keyService.getSignParams(),
      groupId: config.groupId,
    });
    snackbarService.show('????????????');
    runInAction(() => {
      const index = state.list.findIndex((v) => v.groupId === config.groupId);
      if (index !== -1) {
        state.list.splice(index, 1);
      }
    });
  };

  const handleSubmit = async () => {
    const {
      anonymous,
      groupId,
      keystore,
      mixin,
      metamask,
      nft,
    } = state.setGroupConfigDialog;
    if (!groupId) { return; }
    if (nft && !/^0x[a-zA-Z0-9]{40}$/.test(nft)) {
      snackbarService.show('nft???????????????');
      return;
    }
    await runLoading(
      (l) => { state.setGroupConfigDialog.loading = l; },
      async () => {
        await ConfigApi.set({
          ...await keyService.getSignParams(),
          anonymous,
          groupId,
          keystore,
          mixin,
          metamask,
          nft,
        });
        snackbarService.show(`${groupId ? '??????' : '??????'}??????`);
        runInAction(() => {
          state.setGroupConfigDialog.open = false;
        });
        loadData();
      },
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  return (<>
    <div className="flex-col gap-4 p-4">
      <div className="flex-col divide-y divide-white/30">
        {!state.zipped.length && !state.loading && (
          <div className="text-center text-white/60 text-14">
            ????????????
          </div>
        )}
        <div className="py-4">
          <div>
            ???????????? (??? config.yml ??????)
          </div>
          <div>
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.keystore} />} label="keystore??????" />
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.mixin} />} label="mixin??????" />
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.anonymous} />} label="????????????" />
          </div>
        </div>
        {!state.loading && state.zipped.map((v, i) => (
          <div
            className={classNames(
              'py-4',
              v.group.private && 'opacity-50',
            )}
            key={i}
          >
            <div>
              #{v.group.id} {v.shortName} ({v.seedName})
              {v.group.private && (
                <Tooltip title="??????????????????seedUrl??????????????????????????????????????????????????????????????????">
                  <span className="text-red-500">
                    {' '}(private)
                  </span>
                </Tooltip>
              )}
            </div>
            {!v.config && '????????????'}
            {!!v.config && (<>
              <FormControlLabel control={<Checkbox checked={v.config.keystore} />} label="Keystore??????" />
              <FormControlLabel control={<Checkbox checked={v.config.mixin} />} label="Mixin??????" />
              <FormControlLabel control={<Checkbox checked={v.config.metamask} />} label="MetaMask??????" />
              <FormControlLabel control={<Checkbox checked={v.config.anonymous} />} label="????????????" />
              <div className="truncate">
                nft: {v.config.nft || '???'}
              </div>
            </>)}
            <div className="flex gap-4 mt-4">
              <a
                className="!no-underline"
                href={`/${v.group.shortName || v.group.id}`}
                target="_blank"
                rel="noopener"
              >
                <Button variant="outlined">
                  ????????????
                </Button>
              </a>
              <Button
                variant="outlined"
                color="link-soft"
                onClick={() => handleEdit(v.group, v.config)}
              >
                ??????
              </Button>
              {!!v.config && (
                <Button
                  className="text-red-300"
                  variant="outlined"
                  color="inherit"
                  onClick={() => v.config && handleDelete(v.group, v.config)}
                >
                  ??????????????????
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {state.loading && (
        <CircularProgress className="text-white/70" />
      )}
    </div>
    <ThemeLight>
      <Dialog
        open={state.setGroupConfigDialog.open}
        onClose={action(() => { state.setGroupConfigDialog.open = false; })}
      >
        <DialogTitle>
          {!!state.setGroupConfigDialog.groupId && '??????'}
          {!state.setGroupConfigDialog.groupId && '??????'}
          ????????????
          {!!state.setGroupConfigDialog.groupId && ` #${state.setGroupConfigDialog.groupId} `}
          {state.setGroupConfigDialog.name}
        </DialogTitle>
        <DialogContent className="overflow-visible">
          <div className="flex-col w-[400px]">
            <Tooltip title="?????? Keystore ??????" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="Keystore"
                checked={state.setGroupConfigDialog.keystore}
                onChange={action((_, v) => { state.setGroupConfigDialog.keystore = v; })}
              />
            </Tooltip>
            <Tooltip title="?????? Mixin ??????" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="Mixin"
                checked={state.setGroupConfigDialog.mixin}
                onChange={action((_, v) => { state.setGroupConfigDialog.mixin = v; })}
              />
            </Tooltip>
            <Tooltip title="?????? MetaMask ??????" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="MetaMask"
                checked={state.setGroupConfigDialog.metamask}
                onChange={action((_, v) => { state.setGroupConfigDialog.metamask = v; })}
              />
            </Tooltip>
            <Tooltip title="?????? ?????? ??????" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="??????"
                checked={state.setGroupConfigDialog.anonymous}
                onChange={action((_, v) => { state.setGroupConfigDialog.anonymous = v; })}
              />
            </Tooltip>
            <Tooltip title="nft???????????????erc-721 ???????????????" disableInteractive placement="bottom-start">
              <TextField
                className="mt-4"
                label="nft ??????"
                value={state.setGroupConfigDialog.nft}
                onChange={action((e) => { state.setGroupConfigDialog.nft = e.target.value; })}
                size="small"
              />
            </Tooltip>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={handleCancel}
          >
            ??????
          </Button>
          <LoadingButton
            color="link"
            variant="contained"
            onClick={handleSubmit}
            loading={state.setGroupConfigDialog.loading}
          >
            ??????
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </ThemeLight>
  </>);
});
