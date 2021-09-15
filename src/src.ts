import AgoraRTC, {
  ClientConfig,
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';

import { shallowRef, shallowReactive, watchEffect, provide, inject, InjectionKey } from 'vue';

/* eslint-disable @typescript-eslint/ban-types */
const agoraProvider = 'agoraConfig' as {} as InjectionKey<AgoraConfig>;

export interface AgoraConfig {
  token: string;
  appId: string;
  clientOptions?: ClientConfig;
}

interface AVTrack {
  video?: IRemoteVideoTrack;
  audio?: IRemoteAudioTrack;
}

interface LocalTrack<T> {
  readonly isLoading?: true;
  readonly error?: Error;
  readonly track?: T;
}

export function init(config: AgoraConfig) {
  provide(agoraProvider, config);
}

export interface ConnectionResult {
  readonly client: IAgoraRTCClient;
  isLoading?: true;
  isConnected?: true;
  channel?: string;
  remoteTrackByUid: { [uid: string]: AVTrack };
}
export function connect(channelFn: () => string | undefined) {
  const agoraConfig = inject(agoraProvider);
  !agoraConfig && throwError('Agora not configured');

  const client = AgoraRTC.createClient(
    agoraConfig?.clientOptions || {
      mode: 'rtc',
      codec: 'vp8',
    },
  );
  const connectionResult = shallowRef<ConnectionResult>({
    remoteTrackByUid: {},
    client,
  });

  watchEffect((invalidate) => {
    void (async () => {
      connectionResult.value = {
        remoteTrackByUid: shallowReactive({}),
        client,
        channel: channelFn(),
      };

      if (connectionResult.value.channel && agoraConfig) {
        const { appId, token } = agoraConfig;
        await client.join(appId, connectionResult.value.channel, token);
      }

      invalidate(() => {
        void client.leave();
      });
    });
  });

  client.on('user-joined', (user) => {
    connectionResult.value.remoteTrackByUid[user.uid.toString()] = shallowReactive({
      video: undefined,
      audio: undefined,
    });
  });

  client.on('user-left', (user) => {
    delete connectionResult.value.remoteTrackByUid[user.uid.toString()];
  });

  client.on('user-published', (user, mediaType) => {
    void (async () => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        connectionResult.value.remoteTrackByUid[user.uid.toString()].audio = user.audioTrack;
      }
      if (mediaType === 'video') {
        connectionResult.value.remoteTrackByUid[user.uid.toString()].video = user.videoTrack;
      }
    })();
  });

  client.on('user-unpublished', (user, mediaType) => {
    if (mediaType === 'audio') {
      connectionResult.value.remoteTrackByUid[user.uid.toString()].audio = undefined;
    }
    if (mediaType === 'video') {
      connectionResult.value.remoteTrackByUid[user.uid.toString()].video = undefined;
    }
  });

  client.on('connection-state-change', () => {
    if (
      client.connectionState == 'CONNECTING' ||
      client.connectionState == 'DISCONNECTING' ||
      client.connectionState == 'RECONNECTING'
    ) {
      connectionResult.value = { ...connectionResult.value, isLoading: true };
    }
    if (client.connectionState == 'CONNECTED') {
      connectionResult.value = { ...connectionResult.value, isConnected: true };
    }
  });

  return connectionResult;
}

export function useLocalAudioTrack(clientFn: () => IAgoraRTCClient | null | undefined) {
  const result = shallowRef<LocalTrack<IMicrophoneAudioTrack>>();
  watchEffect((invalidate) => {
    const client = clientFn();
    if (client === undefined) {
      result.value = {};
      return;
    }
    result.value = { isLoading: true };
    void (async () => {
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      if (result.value?.isLoading) {
        result.value = { track: track };
        await client?.publish(track);
      }
    })();
    invalidate(() => {
      const track = result.value?.track;
      track && client?.unpublish(track);
      track && track.close();
    });
  });
}

export function useLocalVideoTrack(clientFn: () => IAgoraRTCClient | null | undefined) {
  const result = shallowRef<LocalTrack<ICameraVideoTrack>>();
  watchEffect((invalidate) => {
    const client = clientFn();
    if (client === undefined) {
      result.value = {};
      return;
    }
    result.value = { isLoading: true };
    void (async () => {
      const track = await AgoraRTC.createCameraVideoTrack();
      if (result.value?.isLoading) {
        result.value = { track: track };
        await client?.publish(track);
      }
    })();
    invalidate(() => {
      const track = result.value?.track;
      track && client?.unpublish(track);
      track && track.close();
    });
  });
}

// HELPER
const throwError = (msg: string) => {
  throw new Error(msg);
};
