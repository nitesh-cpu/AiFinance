import React from 'react';
import { Card } from './Card';
import { ResponsiveContainer } from 'recharts';

export const ChartCard = ({ title, subtitle, action, children, height = 300 }) => {
  return (
    <Card title={title} subtitle={subtitle} action={action}>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
