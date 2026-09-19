# Playing a signed URL

Your server asks ExerciseBank for media (`POST /v1/media/urls`) and hands the app the URLs.
They are ordinary HTTPS MP4 and JPEG links: H.264, 640×360, about 8 seconds, silent, cut to loop.
They expire (15 minutes by default), so ask for fresh ones when a screen opens and never store them.

## Web

```html
<video src="{{mp4}}" poster="{{still}}" muted loop playsinline autoplay></video>
```

## React Native (expo-video)

```tsx
import { useVideoPlayer, VideoView } from "expo-video";

export function ExerciseClip({ mp4 }: { mp4: string }) {
  const player = useVideoPlayer(mp4, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={{ width: "100%", aspectRatio: 16 / 9 }} nativeControls={false} />;
}
```

## Swift (AVKit)

```swift
let player = AVPlayer(url: URL(string: media.mp4)!)
player.isMuted = true
player.actionAtItemEnd = .none
NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: player.currentItem, queue: .main) { _ in
    player.seek(to: .zero); player.play()
}
player.play()
```

## Kotlin (Media3 ExoPlayer)

```kotlin
val player = ExoPlayer.Builder(context).build()
player.setMediaItem(MediaItem.fromUri(media.mp4))
player.repeatMode = Player.REPEAT_MODE_ONE
player.volume = 0f
player.prepare(); player.playWhenReady = true
```
