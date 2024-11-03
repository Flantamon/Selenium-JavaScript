const { Builder, By, until, Key } = require('selenium-webdriver');
const safari = require('selenium-webdriver/safari');

const STEAM_URL = 'https://store.steampowered.com/';
const USERNAME = 'USERNAME';
const PASSWORD = 'PASSWORD';
const TIMEOUT = 10000;

async function maximizeWindow(driver) {
    try {
        console.log("Установка окна браузера в полный экран...");
        await driver.manage().window().maximize();
    } catch (error) {
        console.error("Ошибка при установке окна в полный экран:", error);
    }
}

async function login(driver) {
    try {
        console.log("Начало авторизации...");

        await maximizeWindow(driver);

        await driver.get('https://store.steampowered.com/login/');
        await driver.sleep(3000);

        console.log("Ожидание появления поля ввода логина...");
        const loginInput = await driver.wait(
            until.elementLocated(By.xpath("//input[@type='text' or @type='email']")),
            TIMEOUT * 2
        );
        console.log("Поле ввода логина найдено, вводим логин...");
        await loginInput.clear();
        await loginInput.sendKeys(USERNAME);

        console.log("Ожидание появления поля ввода пароля...");
        const passwordInput = await driver.wait(
            until.elementLocated(By.xpath("//input[@type='password']")),
            TIMEOUT * 2
        );
        console.log("Поле ввода пароля найдено, вводим пароль...");
        await passwordInput.clear();
        await passwordInput.sendKeys(PASSWORD);

        console.log("Нажатие кнопки входа...");
        const signInButton = await driver.wait(
            until.elementLocated(By.css('button[type="submit"]')),
            TIMEOUT
        );
        await driver.executeScript("arguments[0].click();", signInButton);
        
        console.log("Ожидание завершения авторизации...");
        await driver.wait(
            until.elementLocated(By.xpath('//*[@id="global_header"]/div/div[2]/div[3]/a[2]')),
            TIMEOUT
        );
        await driver.sleep(3000);

        console.log("Авторизация успешно завершена");
        return true;
        
    } catch (error) {
        console.error("Ошибка при авторизации:", error);
        try {
            const currentUrl = await driver.getCurrentUrl();
            console.error("Текущий URL при ошибке:", currentUrl);
            
            await driver.takeScreenshot().then(function(data) {
                require('fs').writeFileSync('login_error.png', data, 'base64');
                console.log("Скриншот ошибки авторизации сохранен как 'login_error.png'");
            });
        } catch (e) {
            console.error("Не удалось получить текущий URL или сделать скриншот:", e);
        }
        return false;
    }
}

async function addGameToWishlist(driver) {
    try {
        console.log("Поиск строки поиска...");
        const searchBox = await driver.wait(
            until.elementLocated(By.xpath('//*[@id="store_nav_search_term"]')),
            TIMEOUT
        );
        
        console.log("Ввод названия игры 'Rust'...");
        await searchBox.clear();
        await searchBox.sendKeys('Rust', Key.RETURN);
        await driver.sleep(2000);

        const searchResults = await driver.wait(
            until.elementsLocated(By.xpath('//*[@id="search_resultsRows"]/a')),
            TIMEOUT
        );

        for (let i = 0; i < searchResults.length; i++) {
            const game = searchResults[i];
            const gameName = await game.findElement(By.className('title')).getText();
            console.log(`\nПроверка игры: ${gameName}`);

            await driver.executeScript("arguments[0].click();", game);
            await driver.sleep(5000);

            const wishlistButtons = await driver.findElements(By.partialLinkText("В желаемое"));

            if (wishlistButtons.length === 0) {
                console.log(`Кнопка "В желаемое" не найдена для игры "${gameName}", возвращаемся назад...`);
                await driver.navigate().back();
                await driver.sleep(2000);
                continue;
            }

            console.log(`Добавляем игру "${gameName}" в список желаемого...`);
            await driver.executeScript("arguments[0].click();", wishlistButtons[0]);
            
            console.log("Ожидание 2 секунды после нажатия...");
            await driver.sleep(2000);
            
            return gameName;
        }

        throw new Error("Не удалось найти игру с доступной кнопкой 'В желаемое'");
        
    } catch (error) {
        console.error("Ошибка при добавлении игры в список желаемого:", error);
        throw error;
    }
}

async function checkWishlist(driver, gameName) {
    try {
        console.log("Переход в список желаемого...");
        await driver.get(`https://store.steampowered.com/wishlist/profiles/${USERNAME}/`);
        
        console.log("Ожидание 5 секунд для полной загрузки списка желаемого...");
        await driver.sleep(5000);

        console.log("Поиск поля поиска в списке желаемого...");
        const searchBox = await driver.wait(
            until.elementLocated(By.css('#wishlist_search')),
            TIMEOUT
        );

        console.log(`Ввод "${gameName}" в поиск...`);
        await searchBox.clear();
        await searchBox.sendKeys('Rust', Key.RETURN);
        
        console.log("Ожидание обновления результатов поиска...");
        await driver.sleep(3000);

        console.log(`Поиск игры "${gameName}" в отфильтрованном списке...`);
        const wishlistItems = await driver.wait(
            until.elementsLocated(By.css('.wishlist_row')),
            TIMEOUT
        );
        
        console.log(`Найдено игр в списке желаемого: ${wishlistItems.length}`);

        for (let item of wishlistItems) {
            const titleElement = await item.findElement(By.css('.title'));
            const title = await titleElement.getText();
            console.log(`Проверка игры в списке: ${title}`);
            if (title.includes(gameName)) {
                console.log(`Игра "${gameName}" найдена в списке желаемого`);
                return true;
            }
        }

        console.log(`Игра "${gameName}" не найдена в списке желаемого`);
        return false;

    } catch (error) {
        console.error("Ошибка при проверке списка желаемого:", error);
        try {
            const currentUrl = await driver.getCurrentUrl();
            console.error("Текущий URL при ошибке:", currentUrl);
            
            await driver.takeScreenshot().then(function(data) {
                require('fs').writeFileSync('wishlist_error.png', data, 'base64');
                console.log("Скриншот ошибки списка желаемого сохранен как 'wishlist_error.png'");
            });
        } catch (e) {
            console.error("Не удалось получить отладочную информацию:", e);
        }
        throw error;
    }
}

async function relogin(driver) {
    try {
        console.log("Начало повторной авторизации...");
        
        await maximizeWindow(driver);

        console.log("Поиск кнопки входа...");
        let loginButton;
        try {
            loginButton = await driver.wait(
                until.elementLocated(By.css('.global_action_link')),
                TIMEOUT
            );
        } catch (error) {
            console.log("Пробуем альтернативный селектор для кнопки входа...");
            loginButton = await driver.wait(
                until.elementLocated(By.xpath("//a[contains(text(), 'войти')]")),
                TIMEOUT
            );
        }
        
        console.log("Нажатие на кнопку входа...");
        await driver.executeScript("arguments[0].click();", loginButton);
        await driver.sleep(3000);

        console.log("Ожидание появления поля ввода логина...");
        const loginInput = await driver.wait(
            until.elementLocated(By.xpath("//input[@type='text' or @type='email']")),
            TIMEOUT * 2
        );
        console.log("Поле ввода логина найдено, вводим логин...");
        await loginInput.clear();
        await loginInput.sendKeys(USERNAME);

        console.log("Ожидание появления поля ввода пароля...");
        const passwordInput = await driver.wait(
            until.elementLocated(By.xpath("//input[@type='password']")),
            TIMEOUT * 2
        );
        console.log("Поле ввода пароля найдено, вводим пароль...");
        await passwordInput.clear();
        await passwordInput.sendKeys(PASSWORD);

        console.log("Нажатие кнопки входа...");
        const signInButton = await driver.wait(
            until.elementLocated(By.css('button[type="submit"]')),
            TIMEOUT
        );
        await driver.executeScript("arguments[0].click();", signInButton);
        
        console.log("Ожидание завершения авторизации...");
        await driver.wait(
            until.elementLocated(By.xpath('//*[@id="global_header"]/div/div[2]/div[3]/a[2]')),
            TIMEOUT
        );
        await driver.sleep(3000);

        console.log("Повторная авторизация успешно завершена");
        return true;
        
    } catch (error) {
        console.error("Ошибка при повторной авторизации:", error);
        try {
            const currentUrl = await driver.getCurrentUrl();
            console.error("Текущий URL при ошибке:", currentUrl);
            
            await driver.takeScreenshot().then(function(data) {
                require('fs').writeFileSync('relogin_error.png', data, 'base64');
                console.log("Скриншот ошибки авторизации сохранен как 'relogin_error.png'");
            });
        } catch (e) {
            console.error("Не удалось получить текущий URL или сделать скриншот:", e);
        }
        return false;
    }
}

async function changeNickname(driver) {
    try {
        console.log("Переход на страницу профиля...");
        await driver.sleep(2000);

        const profileButton = await driver.wait(
            until.elementLocated(By.xpath('//*[@id="global_header"]/div/div[2]/div[3]/a[2]')),
            TIMEOUT
        );
        
        const profileUrl = await profileButton.getAttribute('href');
        console.log("URL профиля:", profileUrl);

        await driver.executeScript("arguments[0].click();", profileButton);
        await driver.sleep(3000);

        const needRelogin = await driver.findElements(By.css('.global_action_link'));
        if (needRelogin.length > 0) {
            console.log("Требуется повторная авторизация...");
            const loginSuccess = await relogin(driver);
            
            if (loginSuccess) {
                console.log("Переход на страницу профиля после авторизации...");
                const newProfileButton = await driver.wait(
                    until.elementLocated(By.xpath('//*[@id="global_header"]/div/div[2]/div[3]/a[2]')),
                    TIMEOUT
                );
                await driver.executeScript("arguments[0].click();", newProfileButton);
                await driver.sleep(3000);
            } else {
                throw new Error("Не удалось выполнить повторную авторизацию");
            }
        }

        console.log("Поиск кнопки 'Редактировать профиль'...");
        let editButton;
        try {
            editButton = await driver.wait(
                until.elementLocated(By.partialLinkText("Редактировать профиль")),
                TIMEOUT
            );
        } catch (error) {
            console.log("Пробуем альтернативный способ поиска кнопки...");
            editButton = await driver.wait(
                until.elementLocated(By.xpath("//a[contains(@href, '/edit/info')]")),
                TIMEOUT
            );
        }

        await driver.executeScript("arguments[0].scrollIntoView(true);", editButton);
        await driver.sleep(1000);
        await driver.executeScript("arguments[0].click();", editButton);
        await driver.sleep(2000);

        const currentUrl = await driver.getCurrentUrl();
        if (!currentUrl.includes('/edit/info')) {
            throw new Error("Не удалось перейти на страницу редактирования профиля");
        }

        const randomNumber = Math.floor(Math.random() * 100) + 1;
        const newNickname = `NewNikName[${randomNumber}]`;
        console.log(`Сгенерирован новый никнейм: ${newNickname}`);

        console.log("Ввод нового никнейма...");
        const nicknameInput = await driver.findElement(By.className('DialogInput'));
        await nicknameInput.clear();
        await nicknameInput.sendKeys(newNickname);
        await driver.sleep(2000);

        console.log("Поиск кнопки 'Сохранить'...");
        const saveButton = await driver.wait(
            until.elementLocated(By.xpath('//*[@id="react_root"]/div[3]/div[2]/form/div[7]/button[1]')),
            TIMEOUT
        );
        
        console.log("Нажатие кнопки 'Сохранить'...");
        await driver.executeScript("arguments[0].click();", saveButton);
        await driver.sleep(3000);

        console.log("Проверка изменения никнейма...");
        const profileButtonAgain = await driver.findElement(By.css('#global_actions > a'));
        await driver.executeScript("arguments[0].click();", profileButtonAgain);
        await driver.sleep(2000);

        const actualNickname = await driver.findElement(By.className('actual_persona_name')).getText();
        
        if (actualNickname === newNickname) {
            console.log("Никнейм успешно изменен!");
            return true;
        } else {
            console.error(`Ошибка: никнейм не изменился. Ожидалось: ${newNickname}, Получено: ${actualNickname}`);
            return false;
        }

    } catch (error) {
        console.error("Ошибка при смене никнейма:", error);
        throw error;
    }
}

async function main() {
    let driver;
    try {
        driver = await new Builder()
            .forBrowser('safari')
            .setSafariOptions(new safari.Options())
            .build();
            
            await login(driver);

        // Первый тест-кейс: добавление игры в список желаемого
        const gameName = await addGameToWishlist(driver);
        const isInWishlist = await checkWishlist(driver, gameName);
        
        if (!isInWishlist) {
            throw new Error(`Игра "${gameName}" не найдена в списке желаемого после добавления`);
        }
        console.log("Первый тест-кейс успешно завершен!");
       
        // Второй тест-кейс: смена никнейма
        /*console.log("\nНачало второго тест-кейса: смена никнейма");
        const nicknameChanged = await changeNickname(driver);
        
        if (!nicknameChanged) {
            throw new Error("Не удалось изменить никнейм");
        }
        console.log("Второй тест-кейс успешно завершен!");*/
        
    } catch (error) {
        console.error("Произошла ошибка:", error);
        if (driver) {
            await driver.takeScreenshot().then(function(data) {
                require('fs').writeFileSync('error_screenshot.png', data, 'base64');
                console.log("Скриншот ошибки сохранен как 'error_screenshot.png'");
            });
        }
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

main();