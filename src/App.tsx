import React, { useGlobal, useDispatch, useEffect } from 'reactn';
import { Button } from 'antd';
import Editor from '@components/Editor';
import { Splitter } from '@components/Splitter';
import { Explorer } from '@components/Explorer';

import 'antd/dist/antd.css';
import './App.scss';

export const App = () => {
    const login = useDispatch('login');
    const checkLogin = useDispatch('checkLogin');
    useEffect(() => {
        checkLogin();
    }, []);
    const [user] = useGlobal('user');
    return user ? 
        <Splitter initialWidths={[30,70]}><Explorer basePath="abc" /><Editor/></Splitter> :
        <div className="login-screen">
            <h2>קורס תכנות אפליקציות - יצירת תכנים</h2>
            <Button onClick={login} type="primary">כניסה</Button>
        </div>;
};
