/// <reference types="react" />
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { ScrollViewProps } from 'react-native';
import type { BottomTabDescriptorMap, BottomTabNavigationConfig, BottomTabNavigationHelpers, ScrollViewPagingIcons } from '../types';
declare type Props = BottomTabNavigationConfig & {
    state: TabNavigationState<ParamListBase>;
    navigation: BottomTabNavigationHelpers;
    descriptors: BottomTabDescriptorMap;
    scrollEnabled?: boolean;
    scrollViewProps?: ScrollViewProps;
    pagingIcons?: ScrollViewPagingIcons;
    tabCountPerPage?: number;
};
export default function BottomTabView(props: Props): JSX.Element;
export {};
