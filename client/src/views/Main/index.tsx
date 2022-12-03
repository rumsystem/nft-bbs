import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';

import bgImg1x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash.jpg';
import bgImg2x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@2x.jpg';
import bgImg3x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@3x.jpg';
import { nodeService, viewService } from '~/service';
import { Scrollable } from '~/components';

import { Header } from './Header';
import { PostList } from './PostList';
import { PostDetail } from './PostDetail';
import { NewPost } from './NewPost';
import { UserProfile } from './UserProfile';
import { NotificationPage } from './NotificationPage';
import { chooseImgByPixelRatio } from '~/utils';

export const Main = observer(() => (
  <div className="h-[100vh] flex-col">
    <div
      className="fixed z-[-1] inset-[-8px] bg-cover bg-center"
      style={{
        backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
      }}
    />
    {!nodeService.state.loadedData && (
      <div className="flex-col flex-1 flex-center">
        <CircularProgress />
        <div className="text-white mt-6">
          数据加载中 ...
        </div>
      </div>
    )}
    {nodeService.state.loadedData && (<>
      <Header />
      {viewService.state.stack.map((v, i) => {
        const PageComponent = {
          postlist: PostList,
          postdetail: PostDetail,
          newpost: NewPost,
          userprofile: UserProfile,
          notification: NotificationPage,
        }[v.page[0]];
        return (
          <Scrollable
            className={classNames(
              'flex-col flex-1 h-0',
              i !== viewService.state.stack.length - 1 && '!hidden',
            )}
            light
            wide
            key={v.id}
            wrapperClassName="flex-col"
          >
            <PageComponent />
          </Scrollable>
        );
      })}
    </>)}
  </div>
));