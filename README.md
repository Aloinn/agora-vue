# Agora.ts

The agora-vue library provides hooks for making Agora reactive with vue. It parses and wraps the data into reactive variables.

## Setup and Usage

### Script

```TypeScript
import * as Agora from 'agora-vue';

// MAKE REF FOR TOGGLING AUDIO/VIDEO
const isAudioOn = ref(true);
const isVideoOn = ref(true);
const channel = ref<String>();

// CONNECT AND ENABLE HOOKS
const connection = Agora.connect(() => channel.value);
const connectionState = Agora.useConnectionState(
  () => connection.value.client
);

const localAudio = Agora.useLocalAudioTrack(
  connection.value.client,
  () => isAudioOn.value
);
const localVideo = Agora.useLocalVideoTrack(
  connection.value.client,
  () => isVideoOn.value
);

// USE HOOKS HERE
const callStart = () => {
  channel.value = { channel: props.chatId || '', token: token };
};
const callEnd = () => {
  channel.value = undefined;
};
const toggleVideo = () => {
  isVideoOn.value = !isVideoOn.value;
};
const toggleAudio = () => {
  isAudioOn.value = !isAudioOn.value;
};
```
