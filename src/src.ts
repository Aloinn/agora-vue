import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

import { shallowRef, shallowReactive, watchEffect } from 'vue';
import { AgoraConfig, LocalTrack, ConnectionResult, ConnectionStatus } from './interfaces';

let agoraConfig: AgoraConfig | undefined = undefined;
export function init(config: AgoraConfig) {
  agoraConfig = config;
}

export function connect(configFn: () => { channel: string; token: string } | undefined) {
  if (!agoraConfig) {
    throw new Error('Agora not configured');
  }

  const client = AgoraRTC.createClient(
    agoraConfig.clientOptions || {
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
      const config = configFn();
      connectionResult.value = {
        remoteTrackByUid: shallowReactive({}),
        client,
      };
      if (config && agoraConfig) {
        const { appId } = agoraConfig;
        await client.join(appId, config.channel, config.token);
        connectionResult.value = {
          remoteTrackByUid: shallowReactive({}),
          client,
          channel: config.channel,
        };
      }

      invalidate(() => {
        void client.leave();
      });
    })();
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

  return connectionResult;
}

export function useConnectionState(clientFn: () => IAgoraRTCClient) {
  const connectionState = shallowRef<ConnectionStatus>();
  watchEffect((onInvalidate) => {
    const client = clientFn();
    client.on('connection-state-change', () => {
      const state: Record<string, true> = {};
      if (
        client.connectionState == 'CONNECTING' ||
        client.connectionState == 'DISCONNECTING' ||
        client.connectionState == 'RECONNECTING'
      ) {
        state.isLoading = true;
      }
      if (client.connectionState == 'CONNECTED') {
        state.isConnected = true;
      }
      connectionState.value = state;
    });
    onInvalidate(() => {
      client.off('connection-state-change', () => {
        return;
      });
    });
  });
  return connectionState;
}

export function useLocalAudioTrack(client: IAgoraRTCClient, enabledFn: () => boolean) {
  const result = shallowRef<LocalTrack<IMicrophoneAudioTrack>>();
  watchEffect((invalidate) => {
    const enabled = enabledFn();
    if (client === undefined || client === null || !enabled) {
      result.value = {};
      return;
    }
    result.value = { isLoading: true };
    void (async () => {
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      result.value = { track: track };
      client.connectionState == 'CONNECTED' && (await client.publish(track));

      invalidate(() => {
        track && client?.unpublish(track);
        track && track.close();
      });
    })();
  });
  return result;
}

export function useLocalVideoTrack(client: IAgoraRTCClient, enabledFn: () => boolean) {
  const result = shallowRef<LocalTrack<ICameraVideoTrack>>();
  watchEffect((invalidate) => {
    const enabled = enabledFn();
    if (client === undefined || client === null || !enabled) {
      result.value = {};
      return;
    }
    result.value = { isLoading: true };
    void (async () => {
      const track = await AgoraRTC.createCameraVideoTrack();
      result.value = { track: track };
      client.connectionState == 'CONNECTED' && (await client.publish(track));

      invalidate(() => {
        track && client?.unpublish(track);
        track && track.close();
      });
    })();
  });
  return result;
}
