// Aktivitäts-Card im Feed — Chips, Titel, Meta, Host-Zeile (laut Handoff §2).
import React from 'react';
import { View } from 'react-native';
import { T, Card, Badge, Avatar, SkillDots, VerifiedBadge, Row } from './ui';
import { colors, categories } from './theme';

export function EventCard({ event, onPress }) {
  const cat = categories[event.category];
  return (
    <Card onPress={onPress} pad={16}>
      <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        <Badge label={cat.label} color={cat.color} bg={cat.bg} />
        {event.recurringLabel ? (
          <Badge label={`↻ ${event.recurringLabel}`} color={colors.muted} bg={colors.divider} w={700} />
        ) : null}
        {event.match ? (
          <Badge label="✦ Passt zu dir" color={colors.success} bg={colors.successSoft} />
        ) : null}
        <View style={{ marginLeft: 'auto' }}>
          <SkillDots level={event.skillLevel} />
        </View>
      </Row>
      <T s={17} w={800} lh={21} style={{ marginBottom: 6 }}>{event.title}</T>
      <T s={13.5} w={600} c={colors.muted} style={{ marginBottom: 12 }}>
        {event.dateLabel} · {event.timeLabel}  ·  {event.city}{event.distLabel ? ` · ${event.distLabel}` : ''}
      </T>
      <Row gap={8} style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 11 }}>
        <Avatar initials={event.host.initials} color={event.host.avatarColor} size={28} textSize={11} />
        <T s={13} w={700}>{event.host.name}</T>
        {event.host.verified ? <VerifiedBadge size={16} /> : null}
        <View style={{ marginLeft: 'auto' }}>
          <T s={12.5} w={700} c={colors.success}>{event.spotsLabel}</T>
        </View>
      </Row>
    </Card>
  );
}
