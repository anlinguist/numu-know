import { Container, Group } from '@mantine/core';
import classes from './Header.module.css';
import MainLogo from "@/components/Logo/main_logo";
import NavBar from "@/components/Navigation/NavBar";

interface HeaderProps {
    openLoginModal: () => void;
}

function Header({ openLoginModal }: HeaderProps) {
    return (
        <header className={classes.headerContainer}>
            <MainLogo />
            <NavBar openLoginModal={openLoginModal} />
        </header>
    );
}

export default Header;
