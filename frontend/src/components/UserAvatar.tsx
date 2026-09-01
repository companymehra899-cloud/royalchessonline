import React from 'react';
import { View, ViewStyle, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { getAvatar } from '../utils/avatars';

// Renders a user's avatar: a custom uploaded picture (avatar_url) when set,
// otherwise the character portrait mapped from avatar_id. Used everywhere a
// user avatar appears (Home, Match, Leaderboard, Profile).
interface UserAvatarProps {
  avatarId?: string;
  avatarUrl?: string;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarId,
  avatarUrl,
  size,
  borderColor,
  borderWidth,
  backgroundColor,
  style,
}) => {
  const avatar = getAvatar(avatarId);
  const radius = size / 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: backgroundColor || '#1b2333',
          borderWidth: borderWidth ?? 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={avatarUrl ? { uri: avatarUrl } : { uri: avatar.image }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
    </View>
  );
};
