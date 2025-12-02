import React from 'react';
import { Documentation } from '../../lumina-edition/components/Documentation';

export const LuminaDocumentationView: React.FC = () => {
  // Por agora, reutilizamos a Documentation mock como casca visual.
  // Em fases futuras podemos plugar ApiDocsView/RoadmapView aqui.
  return <Documentation />;
};

