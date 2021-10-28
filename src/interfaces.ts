import { ClientConfig, IAgoraRTCClient, IRemoteAudioTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

export interface AgoraConfig {
  appId: string;
  clientOptions?: ClientConfig;
}

export interface AVTrack {
  video?: IRemoteVideoTrack;
  audio?: IRemoteAudioTrack;
}

export interface LocalTrack<T> {
  readonly isLoading?: true;
  readonly error?: Error;
  readonly track?: T;
}

export interface ConnectionResult {
  readonly client: IAgoraRTCClient;
  channel?: string;
  remoteTrackByUid: { [uid: string]: AVTrack };
}
export interface ConnectionStatus {
  isLoading?: true;
  isConnected?: true;
}
