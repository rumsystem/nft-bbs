import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { either, function as fp, taskEither } from 'fp-ts';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip } from '@mui/material';
import type { GroupStatus } from 'nft-bbs-server/orm';

import { GroupApi } from '~/apis';
import { runLoading, ThemeLight, validateSeed } from '~/utils';
import { dialogService, keyService, snackbarService } from '~/service';
import { utils } from 'quorum-light-node-sdk';
import { LoadingButton } from '@mui/lab';
import { Edit } from '@mui/icons-material';
import { editSeedUrl } from '~/modals';
import classNames from 'classnames';

export const GroupPage = observer(() => {
  const state = useLocalObservable(() => ({
    groups: [] as Array<GroupStatus>,
    loading: false,

    addGroupDialog: {
      open: false,
      loading: false,

      id: 0,
      shortName: '',
      mainSeedUrl: '',
      commentSeedUrl: '',
      counterSeedUrl: '',
      profileSeedUrl: '',
    },

    seedCache: {} as Record<string, ReturnType<typeof utils.restoreSeedFromUrl>>,
  }));

  const loadGroups = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await fp.pipe(
          taskEither.fromTask(() => keyService.getSignParams()),
          taskEither.chainW((admin) => () => GroupApi.listAll(admin)),
          taskEither.map(action((v) => {
            state.groups = v;
          })),
        )();
      },
    );
  };

  const handleOpenAddGroup = action(() => {
    state.addGroupDialog = {
      open: true,
      loading: false,
      id: 0,
      shortName: '',
      mainSeedUrl: '',
      commentSeedUrl: '',
      counterSeedUrl: '',
      profileSeedUrl: '',
    };
  });

  const handleCancel = action(() => {
    state.addGroupDialog.open = false;
  });

  const handleEdit = action((group: GroupStatus) => {
    state.addGroupDialog = {
      open: true,
      loading: false,
      id: group.id,
      shortName: group.shortName,
      mainSeedUrl: group.mainSeedUrl,
      commentSeedUrl: group.commentSeedUrl,
      counterSeedUrl: group.counterSeedUrl,
      profileSeedUrl: group.profileSeedUrl,
    };
  });

  const handleSubmit = async () => {
    runInAction(() => {
      ([
        'shortName',
        'mainSeedUrl',
        'commentSeedUrl',
        'counterSeedUrl',
        'profileSeedUrl',
      ] as const).forEach((v) => {
        state.addGroupDialog[v] = state.addGroupDialog[v].trim();
      });
    });

    const seeds = [
      [state.addGroupDialog.mainSeedUrl, '???????????????'],
      [state.addGroupDialog.commentSeedUrl, '??????????????????'],
      [state.addGroupDialog.counterSeedUrl, '??????????????????'],
      [state.addGroupDialog.profileSeedUrl, '????????????????????????'],
    ] as const;

    for (const seed of seeds) {
      const result = validateSeed(seed[0]);
      if (either.isLeft(result)) {
        dialogService.open({
          title: '????????????',
          content: (
            <div className="break-all">
              {seed[1]} ?????????????????? {result.left.message}
            </div>
          ),
        });
        return;
      }
    }

    if (!state.addGroupDialog.shortName) {
      const mainSeed = utils.seedUrlToGroup(state.addGroupDialog.mainSeedUrl);
      state.addGroupDialog.shortName = mainSeed.groupId;
    }

    if (state.addGroupDialog.id) {
      const originalGroup = state.groups.find((v) => v.id === state.addGroupDialog.id);
      if (!originalGroup) { return; }
      const needToRePolling = ([
        [state.addGroupDialog.mainSeedUrl, originalGroup.mainSeedUrl],
        [state.addGroupDialog.commentSeedUrl, originalGroup.commentSeedUrl],
        [state.addGroupDialog.counterSeedUrl, originalGroup.counterSeedUrl],
        [state.addGroupDialog.profileSeedUrl, originalGroup.profileSeedUrl],
      ] as const).some(([seed1, seed2]) => {
        const groupId1 = utils.restoreSeedFromUrl(seed1).group_id;
        const groupId2 = utils.restoreSeedFromUrl(seed2).group_id;
        return groupId1 !== groupId2;
      });
      if (needToRePolling) {
        const result = await dialogService.open({
          content: '???????????????????????????????????????????????? groupId ???????????????????????????????????????????????????',
        });
        if (result === 'cancel') { return; }
      }
      await runLoading(
        (l) => { state.addGroupDialog.loading = l; },
        async () => {
          const result = await GroupApi.update({
            ...await keyService.getSignParams(),
            id: state.addGroupDialog.id,
            shortName: state.addGroupDialog.shortName,
            mainSeedUrl: state.addGroupDialog.mainSeedUrl,
            commentSeedUrl: state.addGroupDialog.commentSeedUrl,
            counterSeedUrl: state.addGroupDialog.counterSeedUrl,
            profileSeedUrl: state.addGroupDialog.profileSeedUrl,
          });
          if (result) {
            snackbarService.show('????????????');
            runInAction(() => {
              state.addGroupDialog.open = false;
            });
            loadGroups();
          }
        },
      );
      return;
    }

    await runLoading(
      (l) => { state.addGroupDialog.loading = l; },
      async () => {
        await GroupApi.add({
          ...await keyService.getSignParams(),
          shortName: state.addGroupDialog.shortName,
          mainSeedUrl: state.addGroupDialog.mainSeedUrl,
          commentSeedUrl: state.addGroupDialog.commentSeedUrl,
          counterSeedUrl: state.addGroupDialog.counterSeedUrl,
          profileSeedUrl: state.addGroupDialog.profileSeedUrl,
        });
        snackbarService.show('????????????');
        runInAction(() => {
          state.addGroupDialog.open = false;
        });
        loadGroups();
      },
    );
  };

  const handleDelete = async (group: GroupStatus) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    const result = await dialogService.open({
      title: '????????????',
      content: (
        <div className="flex-col gap-y-2">
          <p>?????????????????????????????????</p>
          <p>(#{group.id} {group.shortName || seed.group_name})</p>
        </div>
      ),
    });
    if (result === 'cancel') { return; }
    GroupApi.del({
      ...await keyService.getSignParams(),
      id: group.id,
    });
    snackbarService.show('????????????');
    runInAction(() => {
      const index = state.groups.findIndex((v) => v.id === group.id);
      if (index !== -1) {
        state.groups.splice(index, 1);
      }
    });
  };

  const handleRepolling = async (group: GroupStatus) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    const result = await dialogService.open({
      title: '????????????',
      content: (
        <div className="flex-col gap-y-2">
          <p>????????????????????????????????????????????????</p>
          <p>?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????</p>
          <p>(#{group.id} {group.shortName || seed.group_name})</p>
        </div>
      ),
    });
    if (result === 'cancel') { return; }
    GroupApi.repolling({
      ...await keyService.getSignParams(),
      id: group.id,
    });
    snackbarService.show('??????????????????????????????????????????');
  };

  const getGroupFromSeed = (seedUrl: string) => {
    if (state.seedCache[seedUrl]) { return state.seedCache[seedUrl]; }
    const seed = utils.restoreSeedFromUrl(seedUrl);
    state.seedCache[seedUrl] = seed;
    return seed;
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (<>
    <div className="flex-col gap-4 p-4">
      <div className="flex">
        <Button
          onClick={handleOpenAddGroup}
        >
          ??????
        </Button>
      </div>
      <div className="flex-col divide-y divide-white/30">
        {!state.groups.length && !state.loading && (
          <div className="text-center text-white/60 text-14">
            ????????????
          </div>
        )}
        {state.groups.map((v, i) => (
          <div
            className={classNames(
              'py-4',
              v.private && 'opacity-50',
            )}
            key={i}
          >
            <div>
              #{v.id} {v.private && (
                <Tooltip title="??????????????????seedUrl????????????????????????????????????????????????????????????">
                  <span className="text-red-500">
                    (private)
                  </span>
                </Tooltip>
              )}
            </div>
            <div>
              {v.shortName} ({utils.restoreSeedFromUrl(v.mainSeedUrl).group_name})
            </div>
            <div
              className="grid grid-cols-4 gap-x-2"
              style={{
                gridTemplateColumns: 'max-content max-content max-content 1fr',
              }}
            >
              <div>
                ??????????????????
              </div>
              <div>
                {getGroupFromSeed(v.mainSeedUrl).group_id}
              </div>
              <div>
                {getGroupFromSeed(v.mainSeedUrl).group_name}
              </div>
              <div className="truncate text-white/60">
                {v.mainSeedUrl}
              </div>
              <div>
                ?????????????????????
              </div>
              <div>
                {getGroupFromSeed(v.commentSeedUrl).group_id}
              </div>
              <div>
                {getGroupFromSeed(v.commentSeedUrl).group_name}
              </div>
              <div className="truncate text-white/60">
                {v.commentSeedUrl}
              </div>
              <div>
                ?????????????????????
              </div>
              <div>
                {getGroupFromSeed(v.counterSeedUrl).group_id}
              </div>
              <div>
                {getGroupFromSeed(v.counterSeedUrl).group_name}
              </div>
              <div className="truncate text-white/60">
                {v.counterSeedUrl}
              </div>
              <div>
                ???????????????????????????
              </div>
              <div>
                {getGroupFromSeed(v.profileSeedUrl).group_id}
              </div>
              <div>
                {getGroupFromSeed(v.profileSeedUrl).group_name}
              </div>
              <div className="truncate text-white/60">
                {v.profileSeedUrl}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <a
                className="!no-underline"
                href={`/${v.shortName || v.id}`}
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
                onClick={() => handleEdit(v)}
              >
                ??????
              </Button>
              <Button
                className="text-red-300"
                variant="outlined"
                color="inherit"
                onClick={() => handleDelete(v)}
              >
                ??????
              </Button>
              <Button
                className="text-amber-300"
                variant="outlined"
                color="inherit"
                onClick={() => handleRepolling(v)}
              >
                ????????????
              </Button>
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
        open={state.addGroupDialog.open}
        onClose={action(() => { state.addGroupDialog.open = false; })}
      >
        <DialogTitle>
          {!!state.addGroupDialog.id && '??????'}
          {!state.addGroupDialog.id && '??????'}
          ??????
          {!!state.addGroupDialog.id && ` #${state.addGroupDialog.id}`}
        </DialogTitle>
        <DialogContent className="overflow-visible">
          <div className="flex-col gap-4 w-[400px]">
            <Tooltip title="???????????????????????????????????? (port.base.one/<myport>/post/:postId) ??? <myport> ???????????????????????????????????????????????? groupId" disableInteractive>
              <TextField
                label="??????????????????"
                value={state.addGroupDialog.shortName}
                onChange={action((e) => { state.addGroupDialog.shortName = e.target.value; })}
                size="small"
              />
            </Tooltip>
            <TextField
              label="???????????????"
              value={state.addGroupDialog.mainSeedUrl}
              onChange={action((e) => { state.addGroupDialog.mainSeedUrl = e.target.value; })}
              size="small"
              InputProps={{
                className: '!pr-0',
                endAdornment: (
                  <IconButton
                    className="mx-2"
                    size="small"
                    onClick={async () => {
                      const seedUrl = await editSeedUrl(state.addGroupDialog.mainSeedUrl);
                      if (seedUrl) {
                        runInAction(() => { state.addGroupDialog.mainSeedUrl = seedUrl; });
                      }
                    }}
                  >
                    <Edit className="text-20" />
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="??????????????????"
              value={state.addGroupDialog.commentSeedUrl}
              onChange={action((e) => { state.addGroupDialog.commentSeedUrl = e.target.value; })}
              size="small"
              InputProps={{
                className: '!pr-0',
                endAdornment: (
                  <IconButton
                    className="mx-2"
                    size="small"
                    onClick={async () => {
                      const seedUrl = await editSeedUrl(state.addGroupDialog.commentSeedUrl);
                      if (seedUrl) {
                        runInAction(() => { state.addGroupDialog.commentSeedUrl = seedUrl; });
                      }
                    }}
                  >
                    <Edit className="text-20" />
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="??????????????????"
              value={state.addGroupDialog.counterSeedUrl}
              onChange={action((e) => { state.addGroupDialog.counterSeedUrl = e.target.value; })}
              size="small"
              InputProps={{
                className: '!pr-0',
                endAdornment: (
                  <IconButton
                    className="mx-2"
                    size="small"
                    onClick={async () => {
                      const seedUrl = await editSeedUrl(state.addGroupDialog.counterSeedUrl);
                      if (seedUrl) {
                        runInAction(() => { state.addGroupDialog.counterSeedUrl = seedUrl; });
                      }
                    }}
                  >
                    <Edit className="text-20" />
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="????????????????????????"
              value={state.addGroupDialog.profileSeedUrl}
              onChange={action((e) => { state.addGroupDialog.profileSeedUrl = e.target.value; })}
              size="small"
              InputProps={{
                className: '!pr-0',
                endAdornment: (
                  <IconButton
                    className="mx-2"
                    size="small"
                    onClick={async () => {
                      const seedUrl = await editSeedUrl(state.addGroupDialog.profileSeedUrl);
                      if (seedUrl) {
                        runInAction(() => { state.addGroupDialog.profileSeedUrl = seedUrl; });
                      }
                    }}
                  >
                    <Edit className="text-20" />
                  </IconButton>
                ),
              }}
            />
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
            onClick={handleSubmit}
            loading={state.addGroupDialog.loading}
          >
            ??????
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </ThemeLight>
  </>);
});
