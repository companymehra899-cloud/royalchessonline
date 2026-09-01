import React from 'react';
import { View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getAvatar } from '../utils/avatars';

// Renders a user's avatar: a custom uploaded picture (avatar_url) when set,
// otherwise the icon-based avatar mapped from avatar_id. Used everywhere a
// user avatar appears (Home, Match, Leaderboard, Profile) so the custom image
// shows consistently.
interface UserAvatarProps {
  avatarId?: string;
  avatarUrl?: string;
  size: number;
  iconSize?: number;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarId,
  avatarUrl,
  size,
  iconSize,
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
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <MaterialCommunityIcons
          name={avatar.icon}
          size={iconSize ?? Math.round(size * 0.6)}
          color={avatar.color}
        />
      )}
    </View>
  );
};
