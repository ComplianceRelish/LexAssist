declare module 'react-icons/fa';
declare module 'react-icons/md';

declare module 'react-icons' {
  import { ComponentType, SVGAttributes } from 'react';
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  export type IconType = ComponentType<IconBaseProps>;
}