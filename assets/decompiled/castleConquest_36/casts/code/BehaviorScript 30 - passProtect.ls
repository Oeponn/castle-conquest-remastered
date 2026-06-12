property my, my_str, password

on beginSprite me
  my = sprite(me.spriteNum)
  me.reset()
end

on keyDown me
  newChar = key()
  if newChar = BACKSPACE then
    delete password.char[password.char.count]
    delete my_str.char[my_str.char.count]
  else
    if (key() <> TAB) and (key() <> RETURN) then
      password = password & newChar
      my_str = my_str & "*"
    end if
  end if
  my.member.text = my_str
end

on getPassword me
  return password
end

on reset me
  my.member.text = EMPTY
  password = EMPTY
  my_str = my.member.text
end
