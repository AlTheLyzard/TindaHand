import { Image } from 'react-native';
import { operatorIllustrations } from '@/components/operator/operator-illustrations';

/** Shared bitmap illustration for replaying the Operator introduction. */
export function ReplayWalkthroughIllustration() {
  return <Image source={operatorIllustrations.replayWalkthrough} resizeMode="contain" accessible={false}
    style={{ width: 260, height: 260, maxWidth: '100%', alignSelf: 'center' }} />;
}
