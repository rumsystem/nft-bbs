import React, { useRef } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { Button, Dialog, IconButton } from '@mui/material';
import { createPromise, lang, ThemeLight } from '~/utils';
import { modalViewState } from './helper/modalViewState';
import { imageLib } from './imageLib';

export const selectImage = action(() => {
  const p = createPromise<Blob | null>();
  modalViewState.push({
    component: SelectImage,
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  rs: (file: Blob | null) => unknown
}

const SelectImage = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs(null);
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog open={state.open} onClose={handleClose}>
        <div className="flex-col relative w-[300px]">
          <IconButton
            className="absolute top-2 right-2"
            onClick={handleClose}
          >
            <Close />
          </IconButton>
          <A rs={props.rs} />
        </div>
      </Dialog>
    </ThemeLight>
  );
});


const A = observer((props: { rs: (file: Blob) => unknown }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { return; }
    props.rs(file);
  };

  const handleOpenPixabay = async () => {
    const data = await imageLib();
    if (data) {
      props.rs(data);
    }
  };

  return (<>
    <input type="file" accept="image/*" hidden ref={fileInput} onChange={handleFileChange} />
    <div className="flex-col items-center p-8 gap-y-4">
      <div className="text-18 font-medium mb-4">
        {lang.selectImage.title}
      </div>
      <Button
        className="w-40"
        color="link"
        variant="outlined"
        onClick={() => fileInput.current?.click()}
      >
        {lang.selectImage.selectImage}
      </Button>
      <Button
        className="w-40"
        color="link"
        variant="outlined"
        onClick={handleOpenPixabay}
      >
        {lang.selectImage.selectFromImageLib}
      </Button>
    </div>
  </>);
});
