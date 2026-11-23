import { Image } from 'react-native';

/** Supplied artwork for replaying the TindaHand walkthrough. */
export function ReplayWalkthroughIllustration() {
  return <Image source={require('../../../assets/images/inventory/ReplayAppWalkthrough.png')} resizeMode="contain" accessible={false}
    style={{ width: 260, height: 260, maxWidth: '100%', alignSelf: 'center' }} />;
}
