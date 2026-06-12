global objGame

on exitFrame me
  objGame.challenge()
  go(the frame)
end
